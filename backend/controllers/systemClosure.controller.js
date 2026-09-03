import pool from '../config/db.js';
import { computeFinalAverage } from '../utils/finalAverage.js';

const sectionGrade = (nombre) => {
  const t = (nombre || '').trim();
  const m = t.match(/^(\d+)\s/);
  if (m) return parseInt(m[1], 10);
  const ord = { '1er': 1, '1ro': 1, '2do': 2, '2ndo': 2, '3er': 3, '3ro': 3 };
  for (const [k, v] of Object.entries(ord)) {
    if (t.startsWith(k)) return v;
  }
  return null;
};

const sectionBase = (nombre) => {
  let t = (nombre || '').trim();
  t = t.replace(/^\d+\s*/, '');
  t = t.replace(/^(1er|1ro|2do|2ndo|3er|3ro)\s*/, '');
  return t;
};

const isGeneral = (nombre) => {
  return (nombre || '').toLowerCase().includes('general');
};

const findTargetSection = (sections, base, nombreActual, currentGrado, nextGrado) => {
  if (
    nombreActual && nombreActual.toLowerCase().includes('btp salud y bienestar social') &&
    currentGrado === 2 && nextGrado === 3
  ) {
    return sections.find(s =>
      s.activo &&
      sectionGrade(s.nombre) === 3 &&
      s.nombre.toLowerCase().includes('atención primaria en salud')
    ) || null;
  }
  return sections.find(s =>
    s.activo &&
    sectionGrade(s.nombre) === nextGrado &&
    sectionBase(s.nombre).toLowerCase() === base.toLowerCase()
  ) || null;
};

export const closeSystem = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.rollback();
    await connection.beginTransaction();

    const [currentRows] = await connection.query(
      `SELECT ay.id, ay.año FROM students st
       JOIN academic_years ay ON st.academic_year_id = ay.id
       WHERE st.estado = 'activo'
       GROUP BY ay.id, ay.año
       ORDER BY ay.año ASC
       LIMIT 1`
    );
    if (currentRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'No hay alumnos activos para realizar el cierre' });
    }
    const currentYear = currentRows[0];

    const [nextRows] = await connection.query(
      'SELECT id, año FROM academic_years WHERE año > ? ORDER BY año ASC LIMIT 1',
      [currentYear.año]
    );
    if (nextRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'No existe un año académico siguiente para el cierre' });
    }
    const nextYear = nextRows[0];

    const [sections] = await connection.query('SELECT * FROM sections WHERE activo = true');

    const [students] = await connection.query(
      `SELECT st.id, st.grado, st.seccion_id, st.academic_year_id, s.nombre as seccion_nombre
       FROM students st
       LEFT JOIN sections s ON st.seccion_id = s.id
       WHERE st.estado = 'activo'`
    );

    const [existingRecords] = await connection.query(
      'SELECT student_id, academic_year_id FROM academic_records'
    );
    const existingRecordKeys = new Set(
      existingRecords.map(r => `${r.student_id}:${r.academic_year_id}`)
    );

    let promovidos = 0;
    let egresados = 0;
    let reprobados = 0;
    let sinSeccion = 0;

    for (const student of students) {
      const general = isGeneral(student.seccion_nombre);
      const nextGrado = student.grado + 1;
      const maxGrado = general ? 2 : 3;
      const base = sectionBase(student.seccion_nombre);

      const { promedio_general } = await computeFinalAverage(connection, student.id, currentYear.id);
      const reprobado = promedio_general < 6.0;

      if (reprobado) {
        const key = `${student.id}:${currentYear.id}`;
        if (!existingRecordKeys.has(key)) {
          await connection.query(
            `INSERT INTO academic_records (student_id, academic_year_id, grado, seccion_id, estado, promedio_final)
             VALUES (?, ?, ?, ?, 'reprobado', ?)`,
            [student.id, currentYear.id, student.grado, student.seccion_id, promedio_general]
          );
          existingRecordKeys.add(key);
        } else {
          await connection.query(
            `UPDATE academic_records SET estado = 'reprobado', promedio_final = ?
             WHERE student_id = ? AND academic_year_id = ?`,
            [promedio_general, student.id, currentYear.id]
          );
        }

        await connection.query(
          `INSERT INTO reprobados (student_id, academic_year_id, grado, seccion_id, promedio_final)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE grado = VALUES(grado), seccion_id = VALUES(seccion_id), promedio_final = VALUES(promedio_final)`,
          [student.id, currentYear.id, student.grado, student.seccion_id, promedio_general]
        );

        await connection.query(
          'UPDATE students SET academic_year_id = ? WHERE id = ?',
          [nextYear.id, student.id]
        );

        const nextKey = `${student.id}:${nextYear.id}`;
        if (!existingRecordKeys.has(nextKey)) {
          await connection.query(
            `INSERT INTO academic_records (student_id, academic_year_id, grado, seccion_id, estado)
             VALUES (?, ?, ?, ?, 'cursando')`,
            [student.id, nextYear.id, student.grado, student.seccion_id]
          );
          existingRecordKeys.add(nextKey);
        }

        reprobados++;
        continue;
      }

      if (student.grado >= maxGrado) {
        await connection.query(
          "UPDATE students SET estado = 'egresado' WHERE id = ?",
          [student.id]
        );
        const key = `${student.id}:${currentYear.id}`;
        if (!existingRecordKeys.has(key)) {
          await connection.query(
            `INSERT INTO academic_records (student_id, academic_year_id, grado, seccion_id, estado, promedio_final)
             VALUES (?, ?, ?, ?, 'egresado', 0)`,
            [student.id, currentYear.id, student.grado, student.seccion_id]
          );
          existingRecordKeys.add(key);
        }
        egresados++;
        continue;
      }

      const targetSection = findTargetSection(sections, base, student.seccion_nombre, student.grado, nextGrado);
      const targetSectionId = targetSection ? targetSection.id : null;
      if (!targetSectionId) sinSeccion++;

      await connection.query(
        'UPDATE students SET grado = ?, seccion_id = ?, academic_year_id = ? WHERE id = ?',
        [nextGrado, targetSectionId, nextYear.id, student.id]
      );

      const currentKey = `${student.id}:${currentYear.id}`;
      if (!existingRecordKeys.has(currentKey)) {
        await connection.query(
          `INSERT INTO academic_records (student_id, academic_year_id, grado, seccion_id, estado, promedio_final)
           VALUES (?, ?, ?, ?, 'aprobado', 0)`,
          [student.id, currentYear.id, student.grado, student.seccion_id]
        );
        existingRecordKeys.add(currentKey);
      }

      const nextKey = `${student.id}:${nextYear.id}`;
      if (!existingRecordKeys.has(nextKey)) {
        await connection.query(
          `INSERT INTO academic_records (student_id, academic_year_id, grado, seccion_id, estado, promedio_final)
           VALUES (?, ?, ?, ?, 'cursando', 0)`,
          [student.id, nextYear.id, nextGrado, targetSectionId]
        );
        existingRecordKeys.add(nextKey);
      }

      promovidos++;
    }

    await connection.query('UPDATE academic_years SET activo = false WHERE id = ?', [currentYear.id]);
    await connection.query('UPDATE academic_years SET activo = true WHERE id = ?', [nextYear.id]);

    await connection.commit();

    res.json({
      message: `Cierre del sistema completado: ${promovidos} promovidos, ${egresados} egresados, ${reprobados} reprobados`,
      promovidos,
      egresados,
      reprobados,
      sin_seccion: sinSeccion,
      año_actual: { id: currentYear.id, año: currentYear.año },
      año_siguiente: { id: nextYear.id, año: nextYear.año },
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};
