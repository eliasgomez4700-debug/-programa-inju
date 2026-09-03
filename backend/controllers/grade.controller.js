import pool from '../config/db.js';
import { computeFinalAverage } from '../utils/finalAverage.js';

const calculatePPForReport = async (student_id, subject_id, academic_year_id) => {
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

export const getGrades = async (req, res, next) => {
  try {
    let countQuery = `SELECT COUNT(*) as total FROM grades g
      JOIN students st ON g.student_id = st.id
      JOIN subjects s ON g.subject_id = s.id
      JOIN periods p ON g.period_id = p.id
      WHERE 1=1`;
    let query = `SELECT g.*, st.nombre as student_nombre, st.apellido as student_apellido,
                 s.nombre as subject_nombre, p.nombre as period_nombre, p.numero as period_numero
                 FROM grades g
                 JOIN students st ON g.student_id = st.id
                 JOIN subjects s ON g.subject_id = s.id
                 JOIN periods p ON g.period_id = p.id
                 WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (req.query.student_id) {
      query += ' AND g.student_id = ?';
      countQuery += ' AND g.student_id = ?';
      params.push(req.query.student_id);
      countParams.push(req.query.student_id);
    }
    if (req.query.period_id) {
      query += ' AND g.period_id = ?';
      countQuery += ' AND g.period_id = ?';
      params.push(req.query.period_id);
      countParams.push(req.query.period_id);
    }
    if (req.query.subject_id) {
      query += ' AND g.subject_id = ?';
      countQuery += ' AND g.subject_id = ?';
      params.push(req.query.subject_id);
      countParams.push(req.query.subject_id);
    }
    if (req.query.seccion_id) {
      query += ' AND st.seccion_id = ?';
      countQuery += ' AND st.seccion_id = ?';
      params.push(req.query.seccion_id);
      countParams.push(req.query.seccion_id);
    }
    if (req.query.section_ids) {
      const ids = req.query.section_ids.split(',').map(Number).filter(n => !isNaN(n));
      if (ids.length > 0) {
        const ph = ids.map(() => '?').join(',');
        query += ` AND st.seccion_id IN (${ph})`;
        countQuery += ` AND st.seccion_id IN (${ph})`;
        params.push(...ids);
        countParams.push(...ids);
      }
    }
    if (req.query.teacher_id) {
      query += ' AND g.subject_id IN (SELECT subject_id FROM teacher_assignments WHERE teacher_id = ?)';
      countQuery += ' AND g.subject_id IN (SELECT subject_id FROM teacher_assignments WHERE teacher_id = ?)';
      params.push(req.query.teacher_id);
      countParams.push(req.query.teacher_id);
    }

    query += ' ORDER BY st.apellido, st.nombre, p.numero, s.nombre';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (req.query.page) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [grades] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, countParams);

    if (req.query.page) {
      res.json({ data: grades, total, page, limit, pages: Math.ceil(total / limit) });
    } else {
      res.json(grades);
    }
  } catch (err) {
    next(err);
  }
};

export const getGradesByStudentAndPeriod = async (req, res, next) => {
  try {
    const { student_id, period_id } = req.params;
    const [grades] = await pool.query(
      `SELECT g.*, s.nombre as subject_nombre FROM grades g
       JOIN subjects s ON g.subject_id = s.id
       WHERE g.student_id = ? AND g.period_id = ?`,
      [student_id, period_id]
    );
    res.json(grades);
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateGrade = async (req, res, next) => {
  try {
    const { student_id, subject_id, period_id, nota1, nota2, nota3, recuperacion, refuerzo } = req.body;
    if (!student_id || !subject_id || !period_id) {
      return res.status(400).json({ message: 'student_id, subject_id y period_id son requeridos' });
    }

    const n1 = parseFloat(nota1) || 0;
    const n2 = parseFloat(nota2) || 0;
    const n3 = parseFloat(nota3) || 0;
    const rec = parseFloat(recuperacion) || 0;
    const ref = parseFloat(refuerzo) || 0;

    const promedioRegular = (n1 * 0.35) + (n2 * 0.35) + (n3 * 0.30);
    let promedio;
    if (promedioRegular >= 6) {
      promedio = parseFloat(promedioRegular.toFixed(2));
    } else if (rec > 0 || ref > 0) {
      const notaRec = (rec + ref) / 2;
      if (notaRec >= 6) {
        promedio = 6;
      } else {
        promedio = parseFloat(notaRec.toFixed(2));
      }
    } else {
      promedio = parseFloat(promedioRegular.toFixed(2));
    }

    const [existing] = await pool.query(
      'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND period_id = ?',
      [student_id, subject_id, period_id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE grades SET nota1 = ?, nota2 = ?, nota3 = ?, recuperacion = ?, refuerzo = ?, promedio = ? WHERE id = ?',
        [n1, n2, n3, rec, ref, promedio, existing[0].id]
      );
      res.json({ id: existing[0].id, student_id, subject_id, period_id, nota1: n1, nota2: n2, nota3: n3, recuperacion: rec, refuerzo: ref, promedio, message: 'Nota actualizada correctamente' });
    } else {
      const [result] = await pool.query(
        'INSERT INTO grades (student_id, subject_id, period_id, nota1, nota2, nota3, recuperacion, refuerzo, promedio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [student_id, subject_id, period_id, n1, n2, n3, rec, ref, promedio]
      );
      res.status(201).json({ id: result.insertId, student_id, subject_id, period_id, nota1: n1, nota2: n2, nota3: n3, recuperacion: rec, refuerzo: ref, promedio, message: 'Nota creada correctamente' });
    }
  } catch (err) {
    next(err);
  }
};

export const calculateFinalAverage = async (req, res, next) => {
  try {
    const { student_id, academic_year_id } = req.params;

    const result = await computeFinalAverage(pool, student_id, academic_year_id);

    if (result.materias.length === 0) {
      return res.status(400).json({ message: 'No hay notas registradas para este alumno' });
    }

    await pool.query(
      'UPDATE academic_records SET promedio_final = ?, estado = ? WHERE student_id = ? AND academic_year_id = ?',
      [result.promedio_general, result.estado_final, student_id, academic_year_id]
    );

    res.json({
      student_id,
      academic_year_id,
      materias: result.materias,
      promedio_general: result.promedio_general,
      estado_final: result.estado_final
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentReport = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { period_id } = req.query;

    const [studentInfo] = await pool.query(
      'SELECT seccion_id, academic_year_id FROM students WHERE id = ?', [student_id]
    );
    if (!studentInfo[0]) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    const seccionId = studentInfo[0].seccion_id;
    const academicYearId = studentInfo[0].academic_year_id;

    let basicSubjects;
    if (seccionId) {
      const [rows] = await pool.query(
        `SELECT s.id, s.nombre FROM subjects s
         JOIN section_subjects ss ON s.id = ss.subject_id
         WHERE ss.section_id = ? AND s.activo = true AND s.tipo = ?
         ORDER BY s.nombre`,
        [seccionId, 'basica']
      );
      basicSubjects = rows;
    } else {
      [basicSubjects] = await pool.query('SELECT id, nombre FROM subjects WHERE activo = true AND tipo = ?', ['basica']);
    }

    let moduleSubjects;
    if (seccionId) {
      const [rows] = await pool.query(
        `SELECT s.id, s.nombre FROM subjects s
         JOIN section_subjects ss ON s.id = ss.subject_id
         WHERE ss.section_id = ? AND s.activo = true AND s.tipo = ?
         ORDER BY s.nombre`,
        [seccionId, 'modulo']
      );
      moduleSubjects = rows;
    } else {
      [moduleSubjects] = await pool.query('SELECT id, nombre FROM subjects WHERE activo = true AND tipo = ?', ['modulo']);
    }

    let periods;
    if (period_id) {
      const [rows] = await pool.query(
        'SELECT * FROM periods WHERE id = ?', [period_id]
      );
      periods = rows;
    } else if (academicYearId) {
      [periods] = await pool.query(
        `SELECT p.* FROM periods p
        WHERE p.academic_year_id = ? ORDER BY p.numero`, [academicYearId]
      );
    } else {
      periods = [];
    }

    const basicSubjectIds = basicSubjects.map(s => s.id);
    const moduleSubjectIds = moduleSubjects.map(s => s.id);

    let allBasicGrades = [];
    if (basicSubjectIds.length > 0 && periods.length > 0) {
      const periodIds = periods.map(p => p.id);
      const subPh = basicSubjectIds.map(() => '?').join(',');
      const perPh = periodIds.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT g.*, s.nombre as subject_nombre, p.nombre as period_nombre
         FROM grades g
         JOIN subjects s ON g.subject_id = s.id
         JOIN periods p ON g.period_id = p.id
         WHERE g.student_id = ? AND g.subject_id IN (${subPh}) AND g.period_id IN (${perPh})`,
        [student_id, ...basicSubjectIds, ...periodIds]
      );
      allBasicGrades = rows;
    }

    const basicReport = [];
    for (const subject of basicSubjects) {
      const row = { materia: subject.nombre, tipo: 'basica', periodos: [] };
      for (const period of periods) {
        const grade = allBasicGrades.find(g => g.subject_id === subject.id && g.period_id === period.id);
        row.periodos.push({
          periodo: period.nombre,
          notas: grade || { nota1: 0, nota2: 0, nota3: 0, recuperacion: 0, refuerzo: 0, promedio: 0 }
        });
      }
      basicReport.push(row);
    }

    let allModuleGrades = [];
    if (moduleSubjectIds.length > 0 && academicYearId) {
      const subPh = moduleSubjectIds.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT preparacion_nota1, preparacion_nota2, preparacion_nota3,
         ejecucion_nota1, ejecucion_nota2, ejecucion_nota3,
         evaluacion_nota1, evaluacion_nota2, evaluacion_nota3,
         promedio, nivel_logro, subject_id
         FROM module_grades
         WHERE student_id = ? AND subject_id IN (${subPh}) AND academic_year_id = ?`,
        [student_id, ...moduleSubjectIds, academicYearId]
      );
      allModuleGrades = rows;
    }

    const moduleReport = [];
    const defaultModule = { preparacion_nota1: 0, preparacion_nota2: 0, preparacion_nota3: 0, ejecucion_nota1: 0, ejecucion_nota2: 0, ejecucion_nota3: 0, evaluacion_nota1: 0, evaluacion_nota2: 0, evaluacion_nota3: 0, promedio: 0, nivel_logro: 1 };
    for (const subject of moduleSubjects) {
      const mg = allModuleGrades.find(g => g.subject_id === subject.id);
      moduleReport.push({
        materia: subject.nombre,
        tipo: 'modulo',
        notas: mg || { ...defaultModule }
      });
    }

    const [records] = await pool.query(
      'SELECT promedio_final, estado FROM academic_records WHERE student_id = ? ORDER BY id DESC LIMIT 1', [student_id]
    );

    let recoveryReport = [];
    if (academicYearId && basicSubjectIds.length > 0) {
      const subPh = basicSubjectIds.map(() => '?').join(',');
      const [existingRec] = await pool.query(
        `SELECT rg.*, s.nombre as subject_nombre
         FROM recovery_grades rg
         JOIN subjects s ON rg.subject_id = s.id
         WHERE rg.student_id = ? AND rg.subject_id IN (${subPh}) AND rg.academic_year_id = ?`,
        [student_id, ...basicSubjectIds, academicYearId]
      );
      const recMap = new Map(existingRec.map(r => [r.subject_id, r]));

      for (const subject of basicSubjects) {
        const rec = recMap.get(subject.id);
        if (rec) {
          recoveryReport.push(rec);
        } else {
          const pp = await calculatePPForReport(student_id, subject.id, academicYearId);
          recoveryReport.push({
            student_id: parseInt(student_id),
            subject_id: subject.id,
            academic_year_id: academicYearId,
            subject_nombre: subject.nombre,
            pp, ni: 0, pps: 0, sp: 0, sps: 0,
            nf: pp,
            estado: pp >= 6.0 ? 'aprobado' : 'sin recuperación'
          });
        }
      }
    }

    let attitudeReports = [];
    if (period_id) {
      const [rows] = await pool.query(
        `SELECT ar.*, p.nombre as period_nombre, p.numero as period_numero
         FROM attitude_reports ar
         JOIN periods p ON ar.period_id = p.id
         WHERE ar.student_id = ? AND ar.period_id = ?
         ORDER BY p.numero`,
        [student_id, period_id]
      );
      attitudeReports = rows;
    } else {
      const [rows] = await pool.query(
        `SELECT ar.*, p.nombre as period_nombre, p.numero as period_numero
         FROM attitude_reports ar
         JOIN periods p ON ar.period_id = p.id
         WHERE ar.student_id = ?
         ORDER BY p.numero`,
        [student_id]
      );
      attitudeReports = rows;
    }

    res.json({
      materias_basicas: basicReport,
      materias_modulo: moduleReport,
      recuperacion: recoveryReport,
      actitud: attitudeReports,
      periodos: periods,
      promedio_final: records[0]?.promedio_final || 0,
      estado_final: records[0]?.estado || 'cursando'
    });
  } catch (err) {
    next(err);
  }
};
