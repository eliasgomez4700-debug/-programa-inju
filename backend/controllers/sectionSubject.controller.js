import pool from '../config/db.js';

export const getSectionSubjects = async (req, res, next) => {
  try {
    let query = `SELECT ss.*, sec.nombre as section_nombre, s.nombre as subject_nombre, s.tipo as subject_tipo
                 FROM section_subjects ss
                 JOIN sections sec ON ss.section_id = sec.id
                 JOIN subjects s ON ss.subject_id = s.id
                 WHERE 1=1`;
    const params = [];

    if (req.query.section_id) {
      query += ' AND ss.section_id = ?';
      params.push(req.query.section_id);
    }
    if (req.query.subject_id) {
      query += ' AND ss.subject_id = ?';
      params.push(req.query.subject_id);
    }

    query += ' ORDER BY sec.nombre, s.nombre';
    const [data] = await pool.query(query, params);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const createSectionSubject = async (req, res, next) => {
  try {
    const { section_id, subject_id } = req.body;
    if (!section_id || !subject_id) {
      return res.status(400).json({ message: 'section_id y subject_id son requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO section_subjects (section_id, subject_id) VALUES (?, ?)',
      [section_id, subject_id]
    );
    res.status(201).json({ id: result.insertId, section_id, subject_id, message: 'Asignación creada correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Esta materia ya está asignada a esta sección' });
    }
    next(err);
  }
};

export const deleteSectionSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM section_subjects WHERE id = ?', [id]);
    res.json({ message: 'Asignación eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};
