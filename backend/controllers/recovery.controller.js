import pool from '../config/db.js';

export const getRecoveryGrades = async (req, res, next) => {
  try {
    let query = `SELECT rg.*, st.nombre as student_nombre, st.apellido as student_apellido,
                 s.nombre as subject_nombre, ay.año as academic_year_anio
                 FROM recovery_grades rg
                 JOIN students st ON rg.student_id = st.id
                 JOIN subjects s ON rg.subject_id = s.id
                 JOIN academic_years ay ON rg.academic_year_id = ay.id
                 WHERE 1=1`;
    const params = [];

    if (req.query.student_id) {
      query += ' AND rg.student_id = ?';
      params.push(req.query.student_id);
    }
    if (req.query.subject_id) {
      query += ' AND rg.subject_id = ?';
      params.push(req.query.subject_id);
    }
    if (req.query.academic_year_id) {
      query += ' AND rg.academic_year_id = ?';
      params.push(req.query.academic_year_id);
    }
    if (req.query.seccion_id) {
      query += ' AND st.seccion_id = ?';
      params.push(req.query.seccion_id);
    }

    query += ' ORDER BY st.apellido, st.nombre, s.nombre';
    const [grades] = await pool.query(query, params);
    res.json(grades);
  } catch (err) {
    next(err);
  }
};

export const calculatePP = async (student_id, subject_id, academic_year_id) => {
  const [periods] = await pool.query(
    'SELECT id FROM periods WHERE academic_year_id = ?', [academic_year_id]
  );
  if (periods.length === 0) return 0;

  const periodIds = periods.map(p => p.id);
  const placeholders = periodIds.map(() => '?').join(',');
  const [grades] = await pool.query(
    `SELECT AVG(g.promedio) as pp FROM grades g
     WHERE g.student_id = ? AND g.subject_id = ? AND g.period_id IN (${placeholders})`,
    [student_id, subject_id, ...periodIds]
  );

  return parseFloat(Number(grades[0]?.pp || 0).toFixed(2));
};

const calcularNF = (pp, ni, pps, sp, sps) => {
  if (pp >= 6.0) return { nf: pp, estado: 'aprobado' };

  let nf = pp;

  if (ni > 0) {
    if (ni >= 6.0) return { nf: 6.0, estado: 'aprobado' };
    nf = ni;
  }

  if (pps > 0) {
    if (pps >= 6.0) return { nf: 6.0, estado: 'aprobado' };
    nf = pps;
  }

  if (sp > 0) {
    if (sp >= 6.0) return { nf: 6.0, estado: 'aprobado' };
    nf = sp;
  }

  if (sps > 0) {
    if (sps >= 6.0) return { nf: 6.0, estado: 'aprobado' };
    nf = sps;
  }

  return { nf: parseFloat(nf.toFixed(2)), estado: nf >= 6.0 ? 'aprobado' : 'reprobado' };
};

export const createOrUpdateRecoveryGrade = async (req, res, next) => {
  try {
    const { student_id, subject_id, academic_year_id, ni, pps, sp, sps } = req.body;
    if (!student_id || !subject_id || !academic_year_id) {
      return res.status(400).json({ message: 'student_id, subject_id y academic_year_id son requeridos' });
    }

    const pp = await calculatePP(student_id, subject_id, academic_year_id);
    const nNi = parseFloat(ni) || 0;
    const nPps = parseFloat(pps) || 0;
    const nSp = parseFloat(sp) || 0;
    const nSps = parseFloat(sps) || 0;

    const { nf, estado } = calcularNF(pp, nNi, nPps, nSp, nSps);

    const [existing] = await pool.query(
      'SELECT id FROM recovery_grades WHERE student_id = ? AND subject_id = ? AND academic_year_id = ?',
      [student_id, subject_id, academic_year_id]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE recovery_grades SET pp = ?, ni = ?, pps = ?, sp = ?, sps = ?, nf = ?, estado = ?
         WHERE id = ?`,
        [pp, nNi, nPps, nSp, nSps, nf, estado, existing[0].id]
      );
      res.json({ id: existing[0].id, student_id, subject_id, academic_year_id, pp, ni: nNi, pps: nPps, sp: nSp, sps: nSps, nf, estado, message: 'Nota de recuperación actualizada correctamente' });
    } else {
      const [result] = await pool.query(
        `INSERT INTO recovery_grades (student_id, subject_id, academic_year_id, pp, ni, pps, sp, sps, nf, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, subject_id, academic_year_id, pp, nNi, nPps, nSp, nSps, nf, estado]
      );
      res.status(201).json({ id: result.insertId, student_id, subject_id, academic_year_id, pp, ni: nNi, pps: nPps, sp: nSp, sps: nSps, nf, estado, message: 'Nota de recuperación creada correctamente' });
    }
  } catch (err) {
    next(err);
  }
};

export const deleteRecoveryGrade = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM recovery_grades WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Nota de recuperación no encontrada' });
    }
    res.json({ message: 'Nota de recuperación eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const getRecoveryGradesByStudent = async (req, res, next) => {
  try {
    const { student_id, academic_year_id } = req.params;

    const [periods] = await pool.query(
      'SELECT id FROM periods WHERE academic_year_id = ?', [academic_year_id]
    );
    const periodIds = periods.map(p => p.id);

    let basicSubjects;
    const [studentInfo] = await pool.query('SELECT seccion_id FROM students WHERE id = ?', [student_id]);
    const seccionId = studentInfo[0]?.seccion_id;

    if (seccionId) {
      const [rows] = await pool.query(
        `SELECT s.id, s.nombre FROM subjects s
         JOIN section_subjects ss ON s.id = ss.subject_id
         WHERE ss.section_id = ? AND s.activo = true AND s.tipo = 'basica'
         ORDER BY s.nombre`,
        [seccionId]
      );
      basicSubjects = rows;
    } else {
      [basicSubjects] = await pool.query('SELECT id, nombre FROM subjects WHERE activo = true AND tipo = ?', ['basica']);
    }

    const subjectIds = basicSubjects.map(s => s.id);
    const existingMap = new Map();

    if (subjectIds.length > 0) {
      const ph = subjectIds.map(() => '?').join(',');
      const [existingRows] = await pool.query(
        `SELECT * FROM recovery_grades WHERE student_id = ? AND subject_id IN (${ph}) AND academic_year_id = ?`,
        [student_id, ...subjectIds, academic_year_id]
      );
      for (const row of existingRows) {
        existingMap.set(row.subject_id, row);
      }
    }

    const ppMap = new Map();
    if (periodIds.length > 0 && subjectIds.length > 0) {
      const perPh = periodIds.map(() => '?').join(',');
      const subPh = subjectIds.map(() => '?').join(',');
      const [ppRows] = await pool.query(
        `SELECT subject_id, AVG(promedio) as pp FROM grades
         WHERE student_id = ? AND subject_id IN (${subPh}) AND period_id IN (${perPh})
         GROUP BY subject_id`,
        [student_id, ...subjectIds, ...periodIds]
      );
      for (const row of ppRows) {
        ppMap.set(row.subject_id, parseFloat(Number(row.pp).toFixed(2)));
      }
    }

    const result = basicSubjects.map(subject => {
      const existing = existingMap.get(subject.id);
      const pp = ppMap.get(subject.id) || 0;

      return {
        student_id: parseInt(student_id),
        subject_id: subject.id,
        subject_nombre: subject.nombre,
        pp,
        ni: existing?.ni || 0,
        pps: existing?.pps || 0,
        sp: existing?.sp || 0,
        sps: existing?.sps || 0,
        nf: existing?.nf || pp,
        estado: existing?.estado || (pp >= 6.0 ? 'aprobado' : 'pendiente'),
        needs_recovery: pp < 6.0
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};
