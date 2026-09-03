import pool from '../config/db.js';

export const getTeachers = async (req, res, next) => {
  try {
    const [teachers] = await pool.query(
      "SELECT id, nombre, email, activo FROM users WHERE rol = 'profesor' AND activo = true ORDER BY nombre"
    );
    res.json(teachers);
  } catch (err) {
    next(err);
  }
};

export const getAssignments = async (req, res, next) => {
  try {
    const { teacher_id } = req.params;
    const [assignments] = await pool.query(
      `SELECT ta.*, s.nombre as subject_nombre, sec.nombre as section_nombre
       FROM teacher_assignments ta
       JOIN subjects s ON ta.subject_id = s.id
       LEFT JOIN sections sec ON ta.section_id = sec.id
       WHERE ta.teacher_id = ?
       ORDER BY s.nombre, sec.nombre, ta.grado`,
      [teacher_id]
    );
    res.json(assignments);
  } catch (err) {
    next(err);
  }
};

export const createAssignment = async (req, res, next) => {
  try {
    const { teacher_id, subject_id, section_id, grado } = req.body;
    if (!teacher_id || !subject_id) {
      return res.status(400).json({ message: 'teacher_id y subject_id son requeridos' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM teacher_assignments WHERE teacher_id = ? AND subject_id = ? AND section_id = ? AND grado = ?',
      [teacher_id, subject_id, section_id || null, grado || null]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Esta asignación ya existe' });
    }

    const [result] = await pool.query(
      'INSERT INTO teacher_assignments (teacher_id, subject_id, section_id, grado) VALUES (?, ?, ?, ?)',
      [teacher_id, subject_id, section_id || null, grado || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Asignación creada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM teacher_assignments WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Asignación no encontrada' });
    res.json({ message: 'Asignación eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const getTeacherStudents = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    if (req.user.rol !== 'profesor') {
      return res.status(403).json({ message: 'Solo profesores' });
    }

    const [assignments] = await pool.query(
      `SELECT subject_id, section_id, grado FROM teacher_assignments WHERE teacher_id = ?`,
      [teacherId]
    );

    if (assignments.length === 0) {
      return res.json([]);
    }

    const conditions = [];
    const params = [];

    for (const a of assignments) {
      const cond = [];
      cond.push('g.subject_id = ?');
      params.push(a.subject_id);

      if (a.section_id) {
        cond.push('st.seccion_id = ?');
        params.push(a.section_id);
      }
      if (a.grado) {
        cond.push('st.grado = ?');
        params.push(a.grado);
      }

      conditions.push('(' + cond.join(' AND ') + ')');
    }

    const query = `
      SELECT DISTINCT st.id, st.nombre, st.apellido, st.grado, st.seccion_id,
             s.nombre as seccion_nombre, g.subject_id, sub.nombre as subject_nombre
      FROM students st
      JOIN grades g ON st.id = g.student_id
      JOIN subjects sub ON g.subject_id = sub.id
      LEFT JOIN sections s ON st.seccion_id = s.id
      WHERE st.estado = 'activo'
      AND (${conditions.join(' OR ')})
      ORDER BY st.apellido, st.nombre
    `;

    const [students] = await pool.query(query, params);
    res.json(students);
  } catch (err) {
    next(err);
  }
};
