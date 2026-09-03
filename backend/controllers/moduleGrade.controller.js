import pool from '../config/db.js';

const obtenerNivelLogro = (notaFinal) => {
  if (notaFinal >= 9.0) return 5;
  if (notaFinal >= 7.0) return 4;
  if (notaFinal >= 5.0) return 3;
  if (notaFinal >= 3.0) return 2;
  return 1;
};

const calcularPromedioFase = (n1, n2, n3) => {
  return ((parseFloat(n1) || 0) + (parseFloat(n2) || 0) + (parseFloat(n3) || 0)) / 3;
};

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

    const pn1 = parseFloat(preparacion_nota1) || 0;
    const pn2 = parseFloat(preparacion_nota2) || 0;
    const pn3 = parseFloat(preparacion_nota3) || 0;
    const en1 = parseFloat(ejecucion_nota1) || 0;
    const en2 = parseFloat(ejecucion_nota2) || 0;
    const en3 = parseFloat(ejecucion_nota3) || 0;
    const en1v = parseFloat(evaluacion_nota1) || 0;
    const en2v = parseFloat(evaluacion_nota2) || 0;
    const en3v = parseFloat(evaluacion_nota3) || 0;

    const promPreparacion = calcularPromedioFase(pn1, pn2, pn3);
    const promEjecucion = calcularPromedioFase(en1, en2, en3);
    const promEvaluacion = calcularPromedioFase(en1v, en2v, en3v);

    const promedio = parseFloat((promPreparacion * 0.25 + promEjecucion * 0.50 + promEvaluacion * 0.25).toFixed(2));
    const nivelLogro = obtenerNivelLogro(promedio);

    const [existing] = await pool.query(
      'SELECT id FROM module_grades WHERE student_id = ? AND subject_id = ? AND academic_year_id = ?',
      [student_id, subject_id, academic_year_id]
    );

    const cols = [
      preparacion_nota1, preparacion_nota2, preparacion_nota3,
      ejecucion_nota1, ejecucion_nota2, ejecucion_nota3,
      evaluacion_nota1, evaluacion_nota2, evaluacion_nota3,
      promedio, nivelLogro
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
      res.json({ id: existing[0].id, promedio, nivel_logro: nivelLogro, message: 'Nota de módulo actualizada correctamente' });
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
