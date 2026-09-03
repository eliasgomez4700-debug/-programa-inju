import pool from '../config/db.js';

export const getAcademicYears = async (req, res, next) => {
  try {
    const [years] = await pool.query('SELECT * FROM academic_years ORDER BY año DESC');
    res.json(years);
  } catch (err) {
    next(err);
  }
};

export const createAcademicYear = async (req, res, next) => {
  try {
    const { año } = req.body;
    if (!año) return res.status(400).json({ message: 'El año es requerido' });
    const [existing] = await pool.query('SELECT id FROM academic_years WHERE año = ?', [año]);
    if (existing.length > 0) return res.status(400).json({ message: 'Este año académico ya existe' });
    const [result] = await pool.query('INSERT INTO academic_years (año) VALUES (?)', [año]);

    for (let i = 1; i <= 4; i++) {
      await pool.query(
        'INSERT INTO periods (nombre, numero, academic_year_id) VALUES (?, ?, ?)',
        [`Periodo ${i}`, i, result.insertId]
      );
    }

    res.status(201).json({ id: result.insertId, año, message: 'Año académico creado con sus 4 periodos' });
  } catch (err) {
    next(err);
  }
};

export const getPeriodsByYear = async (req, res, next) => {
  try {
    const { year_id } = req.params;
    const [periods] = await pool.query('SELECT * FROM periods WHERE academic_year_id = ? ORDER BY numero', [year_id]);
    res.json(periods);
  } catch (err) {
    next(err);
  }
};
