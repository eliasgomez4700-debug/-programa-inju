import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import sectionRoutes from './routes/section.routes.js';
import studentRoutes from './routes/student.routes.js';
import gradeRoutes from './routes/grade.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import meritRoutes from './routes/merit.routes.js';
import subjectRoutes from './routes/subject.routes.js';
import academicYearRoutes from './routes/academicYear.routes.js';
import reportRoutes from './routes/report.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import moduleGradeRoutes from './routes/moduleGrade.routes.js';
import sectionSubjectRoutes from './routes/sectionSubject.routes.js';
import attitudeReportRoutes from './routes/attitudeReport.routes.js';
import recoveryRoutes from './routes/recovery.routes.js';
import systemRoutes from './routes/system.routes.js';
import reprobadoRoutes from './routes/reprobado.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

const rateLimitStore = new Map();
function rateLimit({ windowMs = 60000, max = 100 } = {}) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now - entry.start > windowMs) {
      rateLimitStore.set(key, { start: now, count: 1 });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ message: 'Demasiadas solicitudes. Intente más tarde.' });
    }
    next();
  };
}

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 120 });

app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/merits', meritRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/module-grades', moduleGradeRoutes);
app.use('/api/section-subjects', sectionSubjectRoutes);
app.use('/api/attitude-reports', attitudeReportRoutes);
app.use('/api/recovery-grades', recoveryRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/reprobados', reprobadoRoutes);

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' });
});

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.start > 120000) rateLimitStore.delete(key);
  }
}, 120000);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
