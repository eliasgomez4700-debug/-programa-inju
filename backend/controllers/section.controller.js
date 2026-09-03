import pool from '../config/db.js';

export const getSections = async (req, res, next) => {
  try {
    let query = 'SELECT s.*, (SELECT COUNT(*) FROM students WHERE seccion_id = s.id AND estado = "activo") as total_alumnos FROM sections s WHERE s.activo = true';
    const params = [];
    if (req.query.teacher_id) {
      query += ' AND s.id IN (SELECT section_id FROM teacher_assignments WHERE teacher_id = ? AND section_id IS NOT NULL)';
      params.push(req.query.teacher_id);
    }
    query += ' ORDER BY s.nombre';
    const [sections] = await pool.query(query, params);
    res.json(sections);
  } catch (err) {
    next(err);
  }
};

export const getSectionById = async (req, res, next) => {
  try {
    const [sections] = await pool.query('SELECT * FROM sections WHERE id = ?', [req.params.id]);
    if (sections.length === 0) return res.status(404).json({ message: 'Sección no encontrada' });
    res.json(sections[0]);
  } catch (err) {
    next(err);
  }
};

export const createSection = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ message: 'El nombre de la sección es requerido' });
    const [existing] = await pool.query('SELECT id FROM sections WHERE nombre = ? AND activo = true', [nombre]);
    if (existing.length > 0) return res.status(400).json({ message: 'Ya existe una sección con ese nombre' });
    const [result] = await pool.query('INSERT INTO sections (nombre, descripcion) VALUES (?, ?)', [nombre, descripcion || '']);
    res.status(201).json({ id: result.insertId, nombre, descripcion, message: 'Sección creada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const updateSection = async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body;
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM sections WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Sección no encontrada' });
    await pool.query('UPDATE sections SET nombre = ?, descripcion = ? WHERE id = ?', [
      nombre || existing[0].nombre, descripcion !== undefined ? descripcion : existing[0].descripcion, id
    ]);
    res.json({ message: 'Sección actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const deleteSection = async (req, res, next) => {
  try {
    const [students] = await pool.query('SELECT COUNT(*) as count FROM students WHERE seccion_id = ? AND estado = "activo"', [req.params.id]);
    if (students[0].count > 0) {
      return res.status(400).json({ message: 'No se puede eliminar la sección porque tiene alumnos activos. Transfiéralos primero.' });
    }
    const [result] = await pool.query('UPDATE sections SET activo = false WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Sección no encontrada' });
    res.json({ message: 'Sección eliminada correctamente' });
  } catch (err) {
    next(err);
  }
};
