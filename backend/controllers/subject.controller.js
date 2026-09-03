import pool from '../config/db.js';

export const getSubjects = async (req, res, next) => {
  try {
    let query = 'SELECT * FROM subjects WHERE activo = true';
    const params = [];
    if (req.query.tipo) {
      query += ' AND tipo = ?';
      params.push(req.query.tipo);
    }
    if (req.query.teacher_id) {
      query += ' AND id IN (SELECT subject_id FROM teacher_assignments WHERE teacher_id = ?)';
      params.push(req.query.teacher_id);
    }
    query += ' ORDER BY nombre';
    const [subjects] = await pool.query(query, params);
    res.json(subjects);
  } catch (err) {
    next(err);
  }
};

export const createSubject = async (req, res, next) => {
  try {
    const { nombre, descripcion, tipo } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre de la materia es requerido' });
    const subjectTipo = tipo || 'basica';
    const [result] = await pool.query('INSERT INTO subjects (nombre, descripcion, tipo) VALUES (?, ?, ?)', [nombre, descripcion || '', subjectTipo]);
    res.status(201).json({ id: result.insertId, nombre, tipo: subjectTipo, message: 'Materia creada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, tipo } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre de la materia es requerido' });

    const [existing] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Materia no encontrada' });

    await pool.query('UPDATE subjects SET nombre = ?, descripcion = ?, tipo = ? WHERE id = ?', [nombre, descripcion || '', tipo || 'basica', id]);
    res.json({ id: parseInt(id), nombre, tipo: tipo || 'basica', message: 'Materia actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT id FROM subjects WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Materia no encontrada' });

    const [inUse] = await pool.query(
      'SELECT COUNT(*) as cnt FROM grades WHERE subject_id = ? UNION ALL SELECT COUNT(*) as cnt FROM module_grades WHERE subject_id = ? UNION ALL SELECT COUNT(*) as cnt FROM section_subjects WHERE subject_id = ?',
      [id, id, id]
    );
    const totalUse = inUse.reduce((sum, r) => sum + r.cnt, 0);
    if (totalUse > 0) {
      await pool.query('UPDATE subjects SET activo = false WHERE id = ?', [id]);
      return res.json({ message: 'Materia desactivada correctamente (tiene registros asociados)' });
    }

    await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
    res.json({ message: 'Materia eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};
