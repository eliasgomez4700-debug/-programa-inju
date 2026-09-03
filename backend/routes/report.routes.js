import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import pool from '../config/db.js';
import { generateStudentPDF } from '../controllers/pdfReport.controller.js';

const router = Router();

router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const [totalStudents] = await pool.query("SELECT COUNT(*) as total FROM students WHERE estado = 'activo'");
    const [totalTeachers] = await pool.query("SELECT COUNT(*) as total FROM users WHERE rol = 'profesor' AND activo = true");
    const [totalSections] = await pool.query("SELECT COUNT(*) as total FROM sections WHERE activo = true");
    const [totalSubjects] = await pool.query("SELECT COUNT(*) as total FROM subjects WHERE activo = true");
    const [totalGraduados] = await pool.query("SELECT COUNT(*) as total FROM students WHERE estado = 'egresado'");
    const [pendingPromedio] = await pool.query(
      `SELECT COUNT(DISTINCT g.student_id) as total FROM grades g
       JOIN periods p ON g.period_id = p.id
       JOIN academic_years ay ON p.academic_year_id = ay.id
       WHERE ay.activo = true AND g.promedio = 0`
    );

    res.json({
      total_estudiantes: totalStudents[0].total,
      total_profesores: totalTeachers[0].total,
      total_secciones: totalSections[0].total,
      total_materias: totalSubjects[0].total,
      total_egresados: totalGraduados[0].total,
      notas_pendientes: pendingPromedio[0].total
    });
  } catch (err) {
    next(err);
  }
});

router.get('/graduados', authenticate, async (req, res, next) => {
  try {
    const [graduados] = await pool.query(
      `SELECT st.*, s.nombre as seccion_nombre
       FROM students st
       LEFT JOIN sections s ON st.seccion_id = s.id
       WHERE st.estado = 'egresado'
       ORDER BY st.apellido, st.nombre`
    );
    res.json(graduados);
  } catch (err) {
    next(err);
  }
});

router.get('/alumnos-sin-derecho', authenticate, async (req, res, next) => {
  try {
    const [alumnos] = await pool.query(
      `SELECT st.id, st.nombre, st.apellido, st.genero, s.nombre as seccion_nombre,
              COUNT(CASE WHEN md.tipo = 'demerito' THEN 1 END) as total_demeritos
       FROM students st
       JOIN merits_demerits md ON st.id = md.student_id
       LEFT JOIN sections s ON st.seccion_id = s.id
       WHERE st.estado = 'activo'
       GROUP BY st.id
       HAVING total_demeritos >= 15
       ORDER BY total_demeritos DESC`
    );
    res.json(alumnos);
  } catch (err) {
    next(err);
  }
});

router.get('/pdf/:student_id', authenticate, generateStudentPDF);

export default router;
