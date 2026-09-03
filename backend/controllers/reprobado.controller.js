import pool from '../config/db.js';

export const getReprobados = async (req, res, next) => {
  try {
    let baseQuery = `FROM reprobados r
                     JOIN students st ON r.student_id = st.id
                     LEFT JOIN sections s ON r.seccion_id = s.id
                     LEFT JOIN academic_years ay ON r.academic_year_id = ay.id
                     WHERE 1=1`;
    let query = `SELECT r.id, r.student_id, r.academic_year_id, r.grado, r.seccion_id,
                        r.promedio_final, r.created_at,
                        st.nombre, st.apellido, st.genero,
                        s.nombre as seccion_nombre, ay.año ${baseQuery}`;
    let countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const params = [];
    const countParams = [];

    if (req.query.academic_year_id) {
      query += ' AND r.academic_year_id = ?';
      countQuery += ' AND r.academic_year_id = ?';
      params.push(req.query.academic_year_id);
      countParams.push(req.query.academic_year_id);
    }
    if (req.query.grado) {
      query += ' AND r.grado = ?';
      countQuery += ' AND r.grado = ?';
      params.push(req.query.grado);
      countParams.push(req.query.grado);
    }
    if (req.query.seccion_id) {
      query += ' AND r.seccion_id = ?';
      countQuery += ' AND r.seccion_id = ?';
      params.push(req.query.seccion_id);
      countParams.push(req.query.seccion_id);
    }
    if (req.query.search) {
      query += ' AND (st.nombre LIKE ? OR st.apellido LIKE ?)';
      countQuery += ' AND (st.nombre LIKE ? OR st.apellido LIKE ?)';
      const search = `%${req.query.search}%`;
      params.push(search, search);
      countParams.push(search, search);
    }

    query += ' ORDER BY r.academic_year_id DESC, st.apellido, st.nombre';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (req.query.page) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [reprobados] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, countParams);

    if (req.query.page) {
      res.json({ data: reprobados, total, page, limit, pages: Math.ceil(total / limit) });
    } else {
      res.json(reprobados);
    }
  } catch (err) {
    next(err);
  }
};

export const deleteReprobado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM reprobados WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    await pool.query('DELETE FROM reprobados WHERE id = ?', [id]);
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};
