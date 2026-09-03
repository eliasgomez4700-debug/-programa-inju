import pool from '../config/db.js';

const COMPETENCIAS = ['convivencia_cultura_paz', 'decision_autonoma', 'expresion_respeto', 'pertenencia_cultura'];
const VALID_VALUES = ['bueno', 'muy_bueno', 'excelente'];

export const getAttitudeReports = async (req, res, next) => {
  try {
    let query = `SELECT ar.*, 
                        st.nombre as student_nombre, st.apellido as student_apellido,
                        p.nombre as period_nombre, p.numero as period_numero,
                        u.nombre as evaluador_nombre
                 FROM attitude_reports ar
                 JOIN students st ON ar.student_id = st.id
                 JOIN periods p ON ar.period_id = p.id
                 JOIN users u ON ar.evaluador_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (req.query.student_id) {
      query += ' AND ar.student_id = ?';
      params.push(req.query.student_id);
    }
    if (req.query.period_id) {
      query += ' AND ar.period_id = ?';
      params.push(req.query.period_id);
    }
    if (req.query.seccion_id) {
      query += ' AND st.seccion_id = ?';
      params.push(req.query.seccion_id);
    }
    if (req.query.grado) {
      query += ' AND st.grado = ?';
      params.push(req.query.grado);
    }

    query += ' ORDER BY st.apellido, st.nombre, p.numero';
    const [reports] = await pool.query(query, params);
    res.json(reports);
  } catch (err) {
    next(err);
  }
};

export const getAttitudeReportByStudent = async (req, res, next) => {
  try {
    const { student_id, period_id } = req.params;
    const [reports] = await pool.query(
      `SELECT ar.*, u.nombre as evaluador_nombre
       FROM attitude_reports ar
       JOIN users u ON ar.evaluador_id = u.id
       WHERE ar.student_id = ? AND ar.period_id = ?`,
      [student_id, period_id]
    );
    if (reports.length === 0) return res.json(null);
    res.json(reports[0]);
  } catch (err) {
    next(err);
  }
};

export const getStudentAttitudeHistory = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const [reports] = await pool.query(
      `SELECT ar.*, p.nombre as period_nombre, p.numero as period_numero,
              u.nombre as evaluador_nombre
       FROM attitude_reports ar
       JOIN periods p ON ar.period_id = p.id
       JOIN users u ON ar.evaluador_id = u.id
       WHERE ar.student_id = ?
       ORDER BY p.numero`,
      [student_id]
    );
    res.json(reports);
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateAttitudeReport = async (req, res, next) => {
  try {
    const { student_id, period_id, competencias, observaciones } = req.body;
    if (!student_id || !period_id || !competencias) {
      return res.status(400).json({ message: 'Alumno, periodo y competencias son requeridos' });
    }

    for (const key of COMPETENCIAS) {
      if (!competencias[key] || !VALID_VALUES.includes(competencias[key])) {
        return res.status(400).json({ message: `La competencia "${key}" debe ser "bueno", "muy_bueno" o "excelente"` });
      }
    }

    const evaluador_id = req.user.id;

    const [existing] = await pool.query(
      'SELECT id FROM attitude_reports WHERE student_id = ? AND period_id = ?',
      [student_id, period_id]
    );

    const vals = COMPETENCIAS.map(k => competencias[k]);

    if (existing.length > 0) {
      await pool.query(
        `UPDATE attitude_reports 
         SET convivencia_cultura_paz = ?, decision_autonoma = ?, expresion_respeto = ?, pertenencia_cultura = ?,
             evaluador_id = ?, observaciones = ? 
         WHERE id = ?`,
        [...vals, evaluador_id, observaciones || null, existing[0].id]
      );
      res.json({ id: existing[0].id, message: 'Reporte de actitud actualizado correctamente' });
    } else {
      const [result] = await pool.query(
        `INSERT INTO attitude_reports (student_id, period_id, convivencia_cultura_paz, decision_autonoma, expresion_respeto, pertenencia_cultura, evaluador_id, observaciones) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [student_id, period_id, ...vals, evaluador_id, observaciones || null]
      );
      res.status(201).json({ id: result.insertId, message: 'Reporte de actitud creado correctamente' });
    }
  } catch (err) {
    next(err);
  }
};

export const deleteAttitudeReport = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM attitude_reports WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: 'Reporte de actitud eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};
