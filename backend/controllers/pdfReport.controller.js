import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateStudentPDF = async (req, res, next) => {
  try {
    const { student_id } = req.params;
    const { period_id } = req.query;

    // 1. CONSULTAS A LA BASE DE DATOS
    const [studentRows] = await pool.query(
      `SELECT st.*, s.nombre as seccion_nombre, ay.año as año_actual
       FROM students st
       LEFT JOIN sections s ON st.seccion_id = s.id
       LEFT JOIN academic_years ay ON st.academic_year_id = ay.id
       WHERE st.id = ?`, [student_id]
    );
    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    const student = studentRows[0];
    const seccionId = student.seccion_id;
    const academicYearId = student.academic_year_id;

    let basicSubjects = [];
    if (seccionId && academicYearId) {
      const [rows] = await pool.query(
        `SELECT s.id, s.nombre FROM subjects s
         JOIN section_subjects ss ON s.id = ss.subject_id
         WHERE ss.section_id = ? AND s.activo = true AND s.tipo = 'basica'
         ORDER BY s.id`, [seccionId]
      );
      basicSubjects = rows;
    }

    let moduleSubjects = [];
    if (seccionId && academicYearId) {
      const [rows] = await pool.query(
        `SELECT s.id, s.nombre FROM subjects s
         JOIN section_subjects ss ON s.id = ss.subject_id
         WHERE ss.section_id = ? AND s.activo = true AND s.tipo = 'modulo'
         ORDER BY s.id`, [seccionId]
      );
      moduleSubjects = rows;
    }

    let periods = [];
    if (academicYearId) {
      const [rows] = await pool.query(
        'SELECT * FROM periods WHERE academic_year_id = ? ORDER BY numero', [academicYearId]
      );
      periods = rows;
    }

    let allBasicGrades = [];
    if (basicSubjects.length > 0 && periods.length > 0) {
      const subPh = basicSubjects.map(() => '?').join(',');
      const perPh = periods.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT g.subject_id, g.period_id, g.nota1, g.nota2, g.nota3, g.recuperacion, g.refuerzo, g.promedio
         FROM grades g
         WHERE g.student_id = ? AND g.subject_id IN (${subPh}) AND g.period_id IN (${perPh})`,
        [student_id, ...basicSubjects.map(s => s.id), ...periods.map(p => p.id)]
      );
      allBasicGrades = rows;
    }

    let allModuleGrades = [];
    if (moduleSubjects.length > 0 && academicYearId) {
      const subPh = moduleSubjects.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT mg.*, s.nombre as subject_nombre
         FROM module_grades mg
         JOIN subjects s ON mg.subject_id = s.id
         WHERE mg.student_id = ? AND mg.subject_id IN (${subPh}) AND mg.academic_year_id = ?`,
        [student_id, ...moduleSubjects.map(s => s.id), academicYearId]
      );
      allModuleGrades = rows;
    }

    let recoveryData = [];
    if (basicSubjects.length > 0 && academicYearId) {
      const subPh = basicSubjects.map(() => '?').join(',');
      const [recRows] = await pool.query(
        `SELECT rg.*, s.nombre as subject_nombre
         FROM recovery_grades rg
         JOIN subjects s ON rg.subject_id = s.id
         WHERE rg.student_id = ? AND rg.subject_id IN (${subPh}) AND rg.academic_year_id = ?`,
        [student_id, ...basicSubjects.map(s => s.id), academicYearId]
      );
      recoveryData = recRows;
    }

    let attitudeReports = [];
    const [attRows] = await pool.query(
      `SELECT ar.*, p.numero as period_numero FROM attitude_reports ar
       JOIN periods p ON ar.period_id = p.id
       WHERE ar.student_id = ? ORDER BY p.numero`, [student_id]
    );
    attitudeReports = attRows;

    // PRUEBA AVANZO
    let pruebaAvanzoSubjects = [];
    if (seccionId && academicYearId) {
      const avNames = ['Lenguaje', 'Ciencias', 'Estudios Sociales'];
      const ph = avNames.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT s.id, s.nombre FROM subjects s
         JOIN section_subjects ss ON s.id = ss.subject_id
         WHERE ss.section_id = ? AND s.activo = true AND s.nombre IN (${ph})
         ORDER BY FIELD(s.nombre, ${ph})`,
        [seccionId, ...avNames, ...avNames]
      );
      pruebaAvanzoSubjects = rows;
    }

    let pruebaAvanzoGrades = [];
    if (pruebaAvanzoSubjects.length > 0 && academicYearId) {
      const subPh = pruebaAvanzoSubjects.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT g.subject_id, g.period_id, g.nota1, g.nota2, g.nota3, g.recuperacion, g.refuerzo, g.promedio
         FROM grades g
         WHERE g.student_id = ? AND g.subject_id IN (${subPh}) AND g.academic_year_id = ?
         ORDER BY g.subject_id, g.period_id`,
        [student_id, ...pruebaAvanzoSubjects.map(s => s.id), academicYearId]
      );
      pruebaAvanzoGrades = rows;
    }

    // ASISTENCIAS
    let asistencias = { presentes: 0, justificadas: 0, injustificadas: 0 };
    if (academicYearId) {
      const [pres] = await pool.query(
        'SELECT COUNT(*) as total FROM attendance WHERE student_id = ? AND academic_year_id = ? AND estado = ?',
        [student_id, academicYearId, 'presente']
      );
      const [just] = await pool.query(
        'SELECT COUNT(*) as total FROM attendance WHERE student_id = ? AND academic_year_id = ? AND estado = ?',
        [student_id, academicYearId, 'justificado']
      );
      const [injus] = await pool.query(
        'SELECT COUNT(*) as total FROM attendance WHERE student_id = ? AND academic_year_id = ? AND estado = ?',
        [student_id, academicYearId, 'ausente']
      );
      asistencias = {
        presentes: pres[0].total,
        justificadas: just[0].total,
        injustificadas: injus[0].total,
      };
    }

    // 2. CONFIGURACIÓN DEL DOCUMENTO PDF
    const doc = new PDFDocument({
      size: 'letter',
      margins: { top: 30, bottom: 30, left: 35, right: 35 },
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="boleta_${student.apellido}_${student.nombre}.pdf"`);
    doc.pipe(res);

    const startX = 35;
    const pageWidth = doc.page.width - 70; // 542 pt
    let currentY = 30;

    // LOGO ESQUINA SUPERIOR IZQUIERDA
    const logoPath = path.join(__dirname, '../../frontend/img/escudo.jpeg');
    try {
      doc.image(logoPath, 8, 12, { width: 55 });
    } catch (_e) {
      // ignorar si no se encuentra la imagen
    }

    // HELPER: DIBUJAR CELDAS CON BORDE
    const drawCell = (x, y, w, h, text, options = {}) => {
      const {
        align = 'left',
        bold = false,
        fontSize = 7.5,
        bg = null,
        textColor = '#000000',
        borderColor = '#606060',
      } = options;

      if (bg) {
        doc.rect(x, y, w, h).fill(bg);
      }
      doc.rect(x, y, w, h).strokeColor(borderColor).lineWidth(0.5).stroke();

      if (text !== undefined && text !== null) {
        doc.fillColor(textColor)
           .font(bold ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(fontSize);
        
        // Centrado vertical básico
        const textHeight = doc.heightOfString(String(text), { width: w - 4 });
        const padY = Math.max((h - textHeight) / 2, 2);

        doc.text(String(text), x + 2, y + padY, {
          width: w - 4,
          align: align,
        });
      }
    };

    // --- ENCABEZADO MINED ---
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#000');
    doc.text('MINISTERIO DE EDUCACIÓN, CIENCIA Y TECNOLOGÍA', startX, currentY, { align: 'center', width: pageWidth });
    currentY += 11;
    doc.fontSize(8).font('Helvetica');
    doc.text('GERENCIA DE GESTIÓN Y REGISTRO ACADÉMICO', startX, currentY, { align: 'center', width: pageWidth });
    currentY += 10;
    doc.text('DEPARTAMENTO DE REGISTRO ACADÉMICO', startX, currentY, { align: 'center', width: pageWidth });
    currentY += 11;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('BOLETA DE CALIFICACIONES', startX, currentY, { align: 'center', width: pageWidth });
    currentY += 14;

    // --- ENCABEZADO DE INFORMACIÓN GENERAL ---
    const gradoMap = { 1: 'Primer Año', 2: 'Segundo Año', 3: 'Tercer Año' };
    let servicioEducativo;
    const secNombre = (student.seccion_nombre || '').toLowerCase();
    const gradoTexto = gradoMap[student.grado] || `${student.grado}° Año`;

    if (secNombre.includes('desarrollo de software')) {
      servicioEducativo = `Educación Media - Media - Único - Bachillerato Técnico Vocacional - ${gradoTexto} - MODULAR NO ARTICULADO - DESARROLLO DE SOFTWARE - Regular`;
    } else if (secNombre.includes('mantenimiento automotriz')) {
      servicioEducativo = `Educación Media - Media - Único - Bachillerato Técnico Vocacional - ${gradoTexto} - MODULAR NO ARTICULADO - MANTENIMIENTO AUTOMOTRIZ - Regular`;
    } else if (secNombre.includes('administrativo contable')) {
      servicioEducativo = `Educación Media - Media - Único - Bachillerato Técnico Vocacional - ${gradoTexto} - MODULAR NO ARTICULADO - ADMINISTRATIVO CONTABLE - Regular`;
    } else if (secNombre.includes('salud y bienestar social')) {
      servicioEducativo = `Educación Media - Media - Único - Bachillerato Técnico Productivo - ${gradoTexto} - MI ESCUELA - SALUD Y BIENESTAR SOCIAL - Regular`;
    } else if (secNombre.includes('atención primaria en salud') || secNombre.includes('atencion primaria en salud')) {
      servicioEducativo = `Educación Media - Media - Único - Bachillerato Técnico Vocacional - ${gradoTexto} - MODULAR NO ARTICULADO - ATENCIÓN PRIMARIA EN SALUD - Regular`;
    } else if (secNombre.includes('general')) {
      servicioEducativo = `Educación Media - Media - Único - Bachillerato General - ${gradoTexto} - Regular`;
    } else {
      servicioEducativo = 'Educación Media - Bachillerato Técnico Vocacional - Primer Año - MODULAR NO ARTICULADO';
    }

    let planEstudio = 'PL2020 - TÉCNICO VOCACIONAL - MANTENIMIENTO AUTOMOTRIZ';
    if (secNombre.includes('general')) {
      planEstudio = 'PL2020 - GENERAL REGULAR';
    } else if (secNombre.includes('desarrollo de software')) {
      planEstudio = 'PL2020 - TÉCNICO VOCACIONAL - DESARROLLO DE SOFTWARE - MODULAR NO ARTICULADO';
    } else if (secNombre.includes('mantenimiento automotriz')) {
      planEstudio = 'PL2020 - TÉCNICO VOCACIONAL - MANTENIMIENTO AUTOMOTRIZ - MODULAR NO ARTICULADO';
    } else if (secNombre.includes('administrativo contable')) {
      planEstudio = 'PL2020 - TÉCNICO VOCACIONAL - ADMINISTRATIVO CONTABLE - MODULAR NO ARTICULADO';
    } else if (secNombre.includes('salud y bienestar social')) {
      planEstudio = 'PL2025 - TÉCNICO PRODUCTIVO - SALUD Y BIENESTAR SOCIAL';
    } else if (secNombre.includes('atención primaria en salud') || secNombre.includes('atencion primaria en salud')) {
      planEstudio = 'PL2020 - TÉCNICO VOCACIONAL - ATENCIÓN PRIMARIA EN SALUD - MODULAR NO ARTICULADO';
    }

    const infoRows = [
      { label: 'Sede Educativa', val: '12585 - INSTITUTO NACIONAL DE JUCUAPA' },
      { label: 'Servicio Educativo', val: servicioEducativo },
      { label: 'Plan de Estudio', val: planEstudio },
    ];

    infoRows.forEach(r => {
      doc.font('Helvetica-Bold').fontSize(7);
      const labelH = doc.heightOfString(r.label, { width: 106 });
      doc.font('Helvetica').fontSize(7);
      const valH = doc.heightOfString(r.val, { width: pageWidth - 114 });
      const rowH = Math.max(13, labelH, valH) + 4;

      drawCell(startX, currentY, 110, rowH, r.label, { bold: true, fontSize: 7, bg: '#F2F2F2' });
      drawCell(startX + 110, currentY, pageWidth - 110, rowH, r.val, { fontSize: 7 });
      currentY += rowH;
    });

    // Grado, Sección y Año
    drawCell(startX, currentY, 55, 13, 'Grado', { bold: true, fontSize: 7, bg: '#F2F2F2' });
    drawCell(startX + 55, currentY, 130, 13, `${student.grado}° Año` || 'Primer Año', { fontSize: 7 });
    drawCell(startX + 185, currentY, 50, 13, 'Sección', { bold: true, fontSize: 7, bg: '#F2F2F2' });
    drawCell(startX + 235, currentY, 190, 13, `${student.seccion_nombre || 'A'} - Jornada completa`, { fontSize: 7 });
    drawCell(startX + 425, currentY, 35, 13, 'Año', { bold: true, fontSize: 7, bg: '#F2F2F2' });
    drawCell(startX + 460, currentY, pageWidth - 460, 13, String(student.año_actual || '2026'), { fontSize: 7, align: 'center' });
    currentY += 13;

    // Estudiante
    drawCell(startX, currentY, 110, 13, 'Estudiante', { bold: true, fontSize: 7, bg: '#F2F2F2' });
    drawCell(startX + 110, currentY, pageWidth - 110, 13, `${student.id} - ${student.apellido.toUpperCase()}, ${student.nombre.toUpperCase()}`, { bold: true, fontSize: 7 });
    currentY += 18;

    // --- CUADRO DE ASISTENCIAS ---
    const todayStr = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    drawCell(startX, currentY, 130, 14, `Cuadro de asistencias al ${todayStr}`, { bold: true, fontSize: 7, bg: '#F2F2F2' });
    drawCell(startX + 130, currentY, 45, 14, 'Asistencias', { bold: true, fontSize: 7 });
    drawCell(startX + 175, currentY, 35, 14, String(asistencias.presentes), { fontSize: 7, align: 'center' });
    drawCell(startX + 210, currentY, 105, 14, 'Inasistencias justificadas', { bold: true, fontSize: 7 });
    drawCell(startX + 315, currentY, 35, 14, String(asistencias.justificadas), { fontSize: 7, align: 'center' });
    drawCell(startX + 350, currentY, 115, 14, 'Inasistencias sin justificar', { bold: true, fontSize: 7 });
    drawCell(startX + 465, currentY, pageWidth - 465, 14, String(asistencias.injustificadas), { fontSize: 7, align: 'center' });
    currentY += 20;

    // --- LEYENDA DE NOMENCLATURA ---
    doc.font('Helvetica-Oblique').fontSize(6).fillColor('#333');
    doc.text('NI=Nota institucional, PP=Primera prueba recuperación, PPS=PP por suficiencia, SP=Segunda prueba recuperación, SPS=SP por suficiencia, NF=Nota final', startX, currentY, { align: 'center', width: pageWidth });
    currentY += 9;

    // ANCHO DE COLUMNAS PARA TABLAS DE EVALUACIÓN
    // Total = 542pt -> Materia (224), P1-P4 (22x4=88), NI(22), PP(22), PPS(25), SP(22), SPS(25), NF(26), Resultado(88)
    const colW = {
      materia: 224,
      p1: 22, p2: 22, p3: 22, p4: 22,
      ni: 22, pp: 22, pps: 25, sp: 22, sps: 25, nf: 26,
      resultado: 88
    };

    // --- 1. TABLA DE MÓDULOS ---
    if (moduleSubjects.length > 0) {
      let xAcc = startX;
      drawCell(xAcc, currentY, colW.materia, 18, 'Componente plan estudio', { bold: true, fontSize: 7, bg: '#DCE1E5' }); xAcc += colW.materia;
      drawCell(xAcc, currentY, colW.p1, 18, 'P1', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p1;
      drawCell(xAcc, currentY, colW.p2, 18, 'P2', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p2;
      drawCell(xAcc, currentY, colW.p3, 18, 'P3', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p3;
      drawCell(xAcc, currentY, colW.p4, 18, 'P4', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p4;
      drawCell(xAcc, currentY, colW.ni, 18, 'NI', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.ni;
      drawCell(xAcc, currentY, colW.pp, 18, 'PP', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.pp;
      drawCell(xAcc, currentY, colW.pps, 18, 'PPS', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.pps;
      drawCell(xAcc, currentY, colW.sp, 18, 'SP', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.sp;
      drawCell(xAcc, currentY, colW.sps, 18, 'SPS', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.sps;
      drawCell(xAcc, currentY, colW.nf, 18, 'NF', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.nf;
      drawCell(xAcc, currentY, colW.resultado, 18, 'Resultado', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' });
      currentY += 18;

      for (const mod of moduleSubjects) {
        const mg = allModuleGrades.find(g => g.subject_id === mod.id) || {};
        const nf = mg.nivel_logro !== undefined ? mg.nivel_logro : '-';
        const estado = mg.promedio !== undefined && mg.promedio >= 6.0 ? 'Aprobado' : 'Reprobado';

        xAcc = startX;
        drawCell(xAcc, currentY, colW.materia, 16, mod.nombre.toUpperCase(), { fontSize: 7 }); xAcc += colW.materia;
        drawCell(xAcc, currentY, colW.p1, 16, nf, { fontSize: 7, align: 'center' }); xAcc += colW.p1;
        drawCell(xAcc, currentY, colW.p2, 16, nf, { fontSize: 7, align: 'center' }); xAcc += colW.p2;
        drawCell(xAcc, currentY, colW.p3, 16, nf, { fontSize: 7, align: 'center' }); xAcc += colW.p3;
        drawCell(xAcc, currentY, colW.p4, 16, nf, { fontSize: 7, align: 'center' }); xAcc += colW.p4;
        drawCell(xAcc, currentY, colW.ni, 16, nf, { fontSize: 7, align: 'center' }); xAcc += colW.ni;
        drawCell(xAcc, currentY, colW.pp, 16, '', { fontSize: 7, align: 'center' }); xAcc += colW.pp;
        drawCell(xAcc, currentY, colW.pps, 16, '', { fontSize: 7, align: 'center' }); xAcc += colW.pps;
        drawCell(xAcc, currentY, colW.sp, 16, '', { fontSize: 7, align: 'center' }); xAcc += colW.sp;
        drawCell(xAcc, currentY, colW.sps, 16, '', { fontSize: 7, align: 'center' }); xAcc += colW.sps;
        drawCell(xAcc, currentY, colW.nf, 16, nf, { fontSize: 7, align: 'center' }); xAcc += colW.nf;
        drawCell(xAcc, currentY, colW.resultado, 16, estado, { fontSize: 7, align: 'center' });
        currentY += 16;
      }
    }

    currentY += 6;

    // --- 2. TABLA DE MATERIAS BÁSICAS Y ACTITUDES ---
    let xAcc = startX;
    drawCell(xAcc, currentY, colW.materia, 18, 'Componente plan estudio', { bold: true, fontSize: 7, bg: '#DCE1E5' }); xAcc += colW.materia;
    drawCell(xAcc, currentY, colW.p1, 18, 'P1', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p1;
    drawCell(xAcc, currentY, colW.p2, 18, 'P2', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p2;
    drawCell(xAcc, currentY, colW.p3, 18, 'P3', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p3;
    drawCell(xAcc, currentY, colW.p4, 18, 'P4', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p4;
    drawCell(xAcc, currentY, colW.ni, 18, 'NI', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.ni;
    drawCell(xAcc, currentY, colW.pp, 18, 'PP', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.pp;
    drawCell(xAcc, currentY, colW.pps, 18, 'PPS', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.pps;
    drawCell(xAcc, currentY, colW.sp, 18, 'SP', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.sp;
    drawCell(xAcc, currentY, colW.sps, 18, 'SPS', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.sps;
    drawCell(xAcc, currentY, colW.nf, 18, 'NF', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.nf;
    drawCell(xAcc, currentY, colW.resultado, 18, 'Resultado', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' });
    currentY += 18;

    // Filas de Materias Básicas
    for (const sub of basicSubjects) {
      const p1G = allBasicGrades.find(g => g.subject_id === sub.id && g.period_id === periods[0]?.id)?.promedio;
      const p2G = allBasicGrades.find(g => g.subject_id === sub.id && g.period_id === periods[1]?.id)?.promedio;
      const p3G = allBasicGrades.find(g => g.subject_id === sub.id && g.period_id === periods[2]?.id)?.promedio;
      const p4G = allBasicGrades.find(g => g.subject_id === sub.id && g.period_id === periods[3]?.id)?.promedio;

      const toNum = (v) => {
        const n = Number(v);
        return isNaN(n) ? null : n;
      };
      const p1 = toNum(p1G);
      const p2 = toNum(p2G);
      const p3 = toNum(p3G);
      const p4 = toNum(p4G);

      const validGrades = [p1, p2, p3, p4].filter(v => v !== null);
      const niVal = validGrades.length > 0 ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(1) : '-';
      const nfVal = validGrades.length > 0 ? Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length) : '-';

      xAcc = startX;
      drawCell(xAcc, currentY, colW.materia, 15, sub.nombre.toUpperCase(), { fontSize: 7 }); xAcc += colW.materia;
      drawCell(xAcc, currentY, colW.p1, 15, p1 !== null ? Number(p1).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p1;
      drawCell(xAcc, currentY, colW.p2, 15, p2 !== null ? Number(p2).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p2;
      drawCell(xAcc, currentY, colW.p3, 15, p3 !== null ? Number(p3).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p3;
      drawCell(xAcc, currentY, colW.p4, 15, p4 !== null ? Number(p4).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p4;
      drawCell(xAcc, currentY, colW.ni, 15, niVal, { fontSize: 7, align: 'center' }); xAcc += colW.ni;
      drawCell(xAcc, currentY, colW.pp, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.pp;
      drawCell(xAcc, currentY, colW.pps, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.pps;
      drawCell(xAcc, currentY, colW.sp, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.sp;
      drawCell(xAcc, currentY, colW.sps, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.sps;
      drawCell(xAcc, currentY, colW.nf, 15, nfVal, { fontSize: 7, align: 'center' }); xAcc += colW.nf;
      const resultado = nfVal === '-' ? '-' : (Number(nfVal) >= 6 ? 'Aprobado' : 'Reprobado');
      drawCell(xAcc, currentY, colW.resultado, 15, resultado, { fontSize: 7, align: 'center' });
      currentY += 15;
    }

    // MAPEO Y FILAS DE EVALUACIONES ACTITUDINALES
    const formatScale = (val) => {
      if (!val) return 'MB';
      if (val === 'excelente') return 'E';
      if (val === 'muy_bueno') return 'MB';
      if (val === 'bueno') return 'B';
      return String(val).toUpperCase();
    };

    const attitudeItems = [
      { key: 'convivencia_cultura_paz', label: 'EVIDENCIA ACTITUDES FAVORABLES PARA LA CONVIVENCIA Y CULTURA DE PAZ' },
      { key: 'decision_autonoma', label: 'TOMA DECISIONES DE FORMA AUTÓNOMA Y RESPONSABLE' },
      { key: 'expresion_respeto', label: 'SE EXPRESA Y PARTICIPA CON RESPETO' },
      { key: 'pertenencia_cultura', label: 'MUESTRA SENTIDO DE PERTENENCIA Y RESPETO POR NUESTRA CULTURA' },
    ];

    attitudeItems.forEach(item => {
      const p1Att = formatScale(attitudeReports.find(a => a.period_numero === 1)?.[item.key]);
      const p2Att = formatScale(attitudeReports.find(a => a.period_numero === 2)?.[item.key]);
      const p3Att = formatScale(attitudeReports.find(a => a.period_numero === 3)?.[item.key]);
      const p4Att = formatScale(attitudeReports.find(a => a.period_numero === 4)?.[item.key]);

      xAcc = startX;
      drawCell(xAcc, currentY, colW.materia, 20, item.label, { fontSize: 6.5 }); xAcc += colW.materia;
      drawCell(xAcc, currentY, colW.p1, 20, p1Att, { fontSize: 7, align: 'center' }); xAcc += colW.p1;
      drawCell(xAcc, currentY, colW.p2, 20, p2Att, { fontSize: 7, align: 'center' }); xAcc += colW.p2;
      drawCell(xAcc, currentY, colW.p3, 20, p3Att, { fontSize: 7, align: 'center' }); xAcc += colW.p3;
      drawCell(xAcc, currentY, colW.p4, 20, p4Att, { fontSize: 7, align: 'center' }); xAcc += colW.p4;
      drawCell(xAcc, currentY, colW.ni, 20, p4Att, { fontSize: 7, align: 'center' }); xAcc += colW.ni;
      drawCell(xAcc, currentY, colW.pp, 20, '', { fontSize: 7, align: 'center' }); xAcc += colW.pp;
      drawCell(xAcc, currentY, colW.pps, 20, '', { fontSize: 7, align: 'center' }); xAcc += colW.pps;
      drawCell(xAcc, currentY, colW.sp, 20, '', { fontSize: 7, align: 'center' }); xAcc += colW.sp;
      drawCell(xAcc, currentY, colW.sps, 20, '', { fontSize: 7, align: 'center' }); xAcc += colW.sps;
      drawCell(xAcc, currentY, colW.nf, 20, p4Att, { fontSize: 7, align: 'center' }); xAcc += colW.nf;
      drawCell(xAcc, currentY, colW.resultado, 20, '---', { fontSize: 7, align: 'center' });
      currentY += 20;
    });

    // --- 3. TABLA PRUEBA AVANZO ---
    if (pruebaAvanzoSubjects.length > 0) {
      currentY += 4;
      xAcc = startX;
      drawCell(xAcc, currentY, colW.materia, 16, 'PRUEBA AVANZO', { bold: true, fontSize: 7, bg: '#DCE1E5' }); xAcc += colW.materia;
      drawCell(xAcc, currentY, colW.p1, 16, 'P1', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p1;
      drawCell(xAcc, currentY, colW.p2, 16, 'P2', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p2;
      drawCell(xAcc, currentY, colW.p3, 16, 'P3', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p3;
      drawCell(xAcc, currentY, colW.p4, 16, 'P4', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.p4;
      drawCell(xAcc, currentY, colW.ni, 16, 'NI', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.ni;
      drawCell(xAcc, currentY, colW.pp, 16, 'PP', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.pp;
      drawCell(xAcc, currentY, colW.pps, 16, 'PPS', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.pps;
      drawCell(xAcc, currentY, colW.sp, 16, 'SP', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.sp;
      drawCell(xAcc, currentY, colW.sps, 16, 'SPS', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.sps;
      drawCell(xAcc, currentY, colW.nf, 16, 'NF', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' }); xAcc += colW.nf;
      drawCell(xAcc, currentY, colW.resultado, 16, 'Resultado', { bold: true, fontSize: 7, bg: '#DCE1E5', align: 'center' });
      currentY += 16;

      for (const sub of pruebaAvanzoSubjects) {
        const p1G = pruebaAvanzoGrades.find(g => g.subject_id === sub.id && g.period_id === periods[0]?.id)?.promedio;
        const p2G = pruebaAvanzoGrades.find(g => g.subject_id === sub.id && g.period_id === periods[1]?.id)?.promedio;
        const p3G = pruebaAvanzoGrades.find(g => g.subject_id === sub.id && g.period_id === periods[2]?.id)?.promedio;
        const p4G = pruebaAvanzoGrades.find(g => g.subject_id === sub.id && g.period_id === periods[3]?.id)?.promedio;

        const toNum = (v) => {
          const n = Number(v);
          return isNaN(n) ? null : n;
        };
        const p1 = toNum(p1G), p2 = toNum(p2G), p3 = toNum(p3G), p4 = toNum(p4G);
        const validGrades = [p1, p2, p3, p4].filter(v => v !== null);
        const niVal = validGrades.length > 0 ? (validGrades.reduce((a, b) => a + b, 0) / validGrades.length).toFixed(1) : '-';
        const nfVal = validGrades.length > 0 ? Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length) : '-';

        xAcc = startX;
        drawCell(xAcc, currentY, colW.materia, 15, sub.nombre.toUpperCase(), { fontSize: 7 }); xAcc += colW.materia;
        drawCell(xAcc, currentY, colW.p1, 15, p1 !== null ? Number(p1).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p1;
        drawCell(xAcc, currentY, colW.p2, 15, p2 !== null ? Number(p2).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p2;
        drawCell(xAcc, currentY, colW.p3, 15, p3 !== null ? Number(p3).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p3;
        drawCell(xAcc, currentY, colW.p4, 15, p4 !== null ? Number(p4).toFixed(1) : '-', { fontSize: 7, align: 'center' }); xAcc += colW.p4;
        drawCell(xAcc, currentY, colW.ni, 15, niVal, { fontSize: 7, align: 'center' }); xAcc += colW.ni;
        drawCell(xAcc, currentY, colW.pp, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.pp;
        drawCell(xAcc, currentY, colW.pps, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.pps;
        drawCell(xAcc, currentY, colW.sp, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.sp;
        drawCell(xAcc, currentY, colW.sps, 15, '', { fontSize: 7, align: 'center' }); xAcc += colW.sps;
        drawCell(xAcc, currentY, colW.nf, 15, nfVal, { fontSize: 7, align: 'center' }); xAcc += colW.nf;
        const resultado = nfVal === '-' ? '-' : (Number(nfVal) >= 6 ? 'Aprobado' : 'Reprobado');
        drawCell(xAcc, currentY, colW.resultado, 15, resultado, { fontSize: 6.5, align: 'center' });
        currentY += 15;
      }
    }

    // --- PIE DE PÁGINA SIGES ---
    const bottomY = doc.page.height - 48;
    const nowStr = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const timeStr = new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange ? pageRange.count : 1;

    for (let i = 1; i <= totalPages; i++) {
      doc.switchToPage(i - 1);
      try {
        doc.image(logoPath, 8, 12, { width: 55 });
      } catch (_e) {
        // ignorar
      }
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#333');
      doc.text(`Obtenido del sistema Instituto Nacional De Jucuapa  ${nowStr} ${timeStr}`, startX, bottomY);
      doc.text(`${i} / ${totalPages}`, startX, bottomY, { align: 'right', width: pageWidth });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};
