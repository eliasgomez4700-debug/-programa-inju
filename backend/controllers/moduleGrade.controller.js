import pool from '../config/db.js';
import { computeModuleGrade } from '../utils/moduleGradeAverage.js';

export const getModuleGrades = async (req, res, next) => {
  try {
    let query = `SELECT mg.*, st.nombre as student_nombre, st.apellido as student_apellido,
                 s.nombre as subject_nombre
                 FROM module_grades mg
                 JOIN students st ON mg.student_id = st.id
                 JOIN subjects s ON mg.subject_id = s.id
                 WHERE 1=1`;
    const params = [];

    if (req.query.student_id) {
      query += ' AND mg.student_id = ?';
      params.push(req.query.student_id);
    }
    if (req.query.subject_id) {
      query += ' AND mg.subject_id = ?';
      params.push(req.query.subject_id);
    }
    if (req.query.academic_year_id) {
      query += ' AND mg.academic_year_id = ?';
      params.push(req.query.academic_year_id);
    }
    if (req.query.seccion_id) {
      query += ' AND st.seccion_id = ?';
      params.push(req.query.seccion_id);
    }
    if (req.query.teacher_id) {
      query += ' AND mg.subject_id IN (SELECT subject_id FROM teacher_assignments WHERE teacher_id = ?)';
      params.push(req.query.teacher_id);
    }

    query += ' ORDER BY st.apellido, st.nombre, s.nombre';
    const [grades] = await pool.query(query, params);
    res.json(grades);
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateModuleGrade = async (req, res, next) => {
  try {
    const {
      student_id, subject_id, academic_year_id,
      preparacion_nota1, preparacion_nota2, preparacion_nota3,
      ejecucion_nota1, ejecucion_nota2, ejecucion_nota3,
      evaluacion_nota1, evaluacion_nota2, evaluacion_nota3
    } = req.body;

    if (!student_id || !subject_id || !academic_year_id) {
      return res.status(400).json({ message: 'student_id, subject_id y academic_year_id son requeridos' });
    }

    const values = {
      preparacion_nota1: parseFloat(preparacion_nota1) || 0,
      preparacion_nota2: parseFloat(preparacion_nota2) || 0,
      preparacion_nota3: parseFloat(preparacion_nota3) || 0,
      ejecucion_nota1: parseFloat(ejecucion_nota1) || 0,
      ejecucion_nota2: parseFloat(ejecucion_nota2) || 0,
      ejecucion_nota3: parseFloat(ejecucion_nota3) || 0,
      evaluacion_nota1: parseFloat(evaluacion_nota1) || 0,
      evaluacion_nota2: parseFloat(evaluacion_nota2) || 0,
      evaluacion_nota3: parseFloat(evaluacion_nota3) || 0,
    };

    const { promedio, nivel_logro } = computeModuleGrade(values);

    const [existing] = await pool.query(
      'SELECT id FROM module_grades WHERE student_id = ? AND subject_id = ? AND academic_year_id = ?',
      [student_id, subject_id, academic_year_id]
    );

    const cols = [
      values.preparacion_nota1, values.preparacion_nota2, values.preparacion_nota3,
      values.ejecucion_nota1, values.ejecucion_nota2, values.ejecucion_nota3,
      values.evaluacion_nota1, values.evaluacion_nota2, values.evaluacion_nota3,
      promedio, nivel_logro
    ];

    if (existing.length > 0) {
      await pool.query(
        `UPDATE module_grades SET 
         preparacion_nota1 = ?, preparacion_nota2 = ?, preparacion_nota3 = ?,
         ejecucion_nota1 = ?, ejecucion_nota2 = ?, ejecucion_nota3 = ?,
         evaluacion_nota1 = ?, evaluacion_nota2 = ?, evaluacion_nota3 = ?,
         promedio = ?, nivel_logro = ? WHERE id = ?`,
        [...cols, existing[0].id]
      );
      res.json({ id: existing[0].id, promedio, nivel_logro, message: 'Nota de módulo actualizada correctamente' });
    } else {
      const [result] = await pool.query(
        `INSERT INTO module_grades 
         (student_id, subject_id, academic_year_id,
          preparacion_nota1, preparacion_nota2, preparacion_nota3,
          ejecucion_nota1, ejecucion_nota2, ejecucion_nota3,
          evaluacion_nota1, evaluacion_nota2, evaluacion_nota3,
          promedio, nivel_logro) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, subject_id, academic_year_id, ...cols]
      );
      res.status(201).json({ id: result.insertId, promedio, nivel_logro: nivelLogro, message: 'Nota de módulo creada correctamente' });
    }
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateModuleGradesBatch = async (req, res, next) => {
  try {
    const { registros } = req.body;
    if (!Array.isArray(registros)) {
      return res.status(400).json({ message: 'registros debe ser un arreglo' });
    }

    const fieldNames = [
      'preparacion_nota1', 'preparacion_nota2', 'preparacion_nota3',
      'ejecucion_nota1', 'ejecucion_nota2', 'ejecucion_nota3',
      'evaluacion_nota1', 'evaluacion_nota2', 'evaluacion_nota3'
    ];
    let guardados = 0;
    let ignorados = 0;

    for (const reg of registros) {
      const studentId = parseInt(reg.student_id);
      const subjectId = parseInt(reg.subject_id);
      const academicYearId = parseInt(reg.academic_year_id);
      if (!studentId || !subjectId || !academicYearId) continue;

      const hasValue = fieldNames.some(f => {
        const v = reg[f];
        return v !== undefined && v !== null && v !== '';
      });
      if (!hasValue) {
        ignorados++;
        continue;
      }

      const [existing] = await pool.query(
        `SELECT id, ${fieldNames.join(', ')} FROM module_grades WHERE student_id = ? AND subject_id = ? AND academic_year_id = ?`,
        [studentId, subjectId, academicYearId]
      );

      const merged = {};
      for (const f of fieldNames) {
        const v = reg[f];
        merged[f] = (v !== undefined && v !== null && v !== '')
          ? (parseFloat(reg[f]) || 0)
          : (existing.length > 0 ? (parseFloat(existing[0][f]) || 0) : 0);
      }
      const { promedio, nivel_logro } = computeModuleGrade(merged);

      if (existing.length > 0) {
        await pool.query(
          `UPDATE module_grades SET ${fieldNames.map(f => `${f} = ?`).join(', ')}, promedio = ?, nivel_logro = ? WHERE id = ?`,
          [...fieldNames.map(f => merged[f]), promedio, nivel_logro, existing[0].id]
        );
        guardados++;
      } else {
        await pool.query(
          `INSERT INTO module_grades (student_id, subject_id, academic_year_id, ${fieldNames.join(', ')}, promedio, nivel_logro) VALUES (?, ?, ?, ${fieldNames.map(() => '?').join(', ')}, ?, ?)`,
          [studentId, subjectId, academicYearId, ...fieldNames.map(f => merged[f]), promedio, nivel_logro]
        );
        guardados++;
      }
    }

    res.json({ message: `Se guardaron ${guardados} notas de módulo correctamente`, guardados, ignorados });
  } catch (err) {
    next(err);
  }
};

export const getModuleGradeByStudentAndSubject = async (req, res, next) => {
  try {
    const { student_id, subject_id } = req.params;
    const [grades] = await pool.query(
      `SELECT mg.*, s.nombre as subject_nombre FROM module_grades mg
       JOIN subjects s ON mg.subject_id = s.id
       WHERE mg.student_id = ? AND mg.subject_id = ?`,
      [student_id, subject_id]
    );
    res.json(grades[0] || {
      preparacion_nota1: 0, preparacion_nota2: 0, preparacion_nota3: 0,
      ejecucion_nota1: 0, ejecucion_nota2: 0, ejecucion_nota3: 0,
      evaluacion_nota1: 0, evaluacion_nota2: 0, evaluacion_nota3: 0,
      promedio: 0, nivel_logro: 1
    });
  } catch (err) {
    next(err);
  }
};
