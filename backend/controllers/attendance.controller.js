import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAttendance = async (req, res, next) => {
  try {
    const { section_id, academic_year_id, fecha } = req.query;

    let query = `SELECT a.*, st.nombre as student_nombre, st.apellido as student_apellido,
                  sec.nombre as section_nombre
                  FROM attendance a
                  JOIN students st ON a.student_id = st.id
                  JOIN sections sec ON st.seccion_id = sec.id
                  WHERE 1=1`;
    const params = [];

    if (section_id) {
      query += ' AND st.seccion_id = ?';
      params.push(section_id);
    }
    if (academic_year_id) {
      query += ' AND a.academic_year_id = ?';
      params.push(academic_year_id);
    }
    if (fecha) {
      query += ' AND a.fecha = ?';
      params.push(fecha);
    }

    query += ' ORDER BY st.apellido, st.nombre';
    const [attendance] = await pool.query(query, params);
    res.json(attendance);
  } catch (err) {
    next(err);
  }
};

export const saveAttendanceBatch = async (req, res, next) => {
  try {
    const { academic_year_id, fecha, registros } = req.body;
    if (!academic_year_id || !fecha || !registros || !Array.isArray(registros)) {
      return res.status(400).json({ message: 'academic_year_id, fecha y registros son requeridos' });
    }

    for (const reg of registros) {
      const { student_id, estado } = reg;
      if (!student_id || !estado) continue;

      await pool.query(
        `INSERT INTO attendance (student_id, academic_year_id, fecha, estado)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado)`,
        [student_id, academic_year_id, fecha, estado]
      );
    }

    res.json({ message: 'Asistencia guardada correctamente' });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceSummary = async (req, res, next) => {
  try {
    const { student_id, academic_year_id } = req.params;

    const [presentes] = await pool.query(
      'SELECT COUNT(*) as total FROM attendance WHERE student_id = ? AND academic_year_id = ? AND estado = ?',
      [student_id, academic_year_id, 'presente']
    );
    const [ausentes] = await pool.query(
      'SELECT COUNT(*) as total FROM attendance WHERE student_id = ? AND academic_year_id = ? AND estado = ?',
      [student_id, academic_year_id, 'ausente']
    );
    const [justificados] = await pool.query(
      'SELECT COUNT(*) as total FROM attendance WHERE student_id = ? AND academic_year_id = ? AND estado = ?',
      [student_id, academic_year_id, 'justificado']
    );

    res.json({
      presentes: presentes[0].total,
      ausentes: ausentes[0].total,
      justificados: justificados[0].total,
      total: presentes[0].total + ausentes[0].total + justificados[0].total,
    });
  } catch (err) {
    next(err);
  }
};

export const generateAttendancePDF = async (req, res, next) => {
  try {
    const { section_id, academic_year_id, fecha } = req.query;
    if (!section_id || !academic_year_id || !fecha) {
      return res.status(400).json({ message: 'section_id, academic_year_id y fecha son requeridos' });
    }

    const [students] = await pool.query(
      `SELECT st.*, a.estado as asistencia_estado
       FROM students st
       LEFT JOIN attendance a ON a.student_id = st.id AND a.academic_year_id = ? AND a.fecha = ?
       WHERE st.seccion_id = ? AND st.estado = 'activo'
       ORDER BY st.apellido, st.nombre`,
      [academic_year_id, fecha, section_id]
    );

    const [sectionRows] = await pool.query('SELECT nombre FROM sections WHERE id = ?', [section_id]);
    const sectionName = sectionRows.length > 0 ? sectionRows[0].nombre : '';
    const [yearRows] = await pool.query('SELECT año FROM academic_years WHERE id = ?', [academic_year_id]);
    const yearName = yearRows.length > 0 ? String(yearRows[0].año) : '';

    const doc = new PDFDocument({
      size: 'letter',
      margins: { top: 80, bottom: 40, left: 35, right: 35 },
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="asistencia_${fecha}.pdf"`);
    doc.pipe(res);

    const startX = 35;
    const pageWidth = doc.page.width - 70;
    const pageBottom = doc.page.height - 40;

    const logoPath = path.join(__dirname, '../../frontend/img/escudo.jpeg');
    try {
      doc.image(logoPath, 8, 12, { width: 55 });
    } catch (_e) {
      // ignorar si no se encuentra la imagen
    }

    const drawCell = (x, y, w, h, text, options = {}) => {
      const {
        align = 'left',
        bold = false,
        fontSize = 8,
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
        const textHeight = doc.heightOfString(String(text), { width: w - 4 });
        const padY = Math.max((h - textHeight) / 2, 2);
        doc.text(String(text), x + 2, y + padY, {
          width: w - 4,
          align: align,
        });
      }
    };

    const estadoMap = {
      presente: 'Presente',
      ausente: 'Ausente',
      justificado: 'Justificado',
    };

    const estadoColor = {
      presente: '#065f46',
      ausente: '#991b1b',
      justificado: '#92400e',
    };

    const estadoBg = {
      presente: '#d1fae5',
      ausente: '#fee2e2',
      justificado: '#fef3c7',
    };

    const colWidths = {
      no: 25,
      id: 45,
      nombres: 120,
      apellidos: 120,
      seccion: 100,
      estado: 80,
      firma: 52,
    };

    const drawTableHeader = () => {
      let xAcc = startX;
      drawCell(xAcc, currentY, colWidths.no, 18, 'No.', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.no;
      drawCell(xAcc, currentY, colWidths.id, 18, 'Código', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.id;
      drawCell(xAcc, currentY, colWidths.nombres, 18, 'Nombres', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.nombres;
      drawCell(xAcc, currentY, colWidths.apellidos, 18, 'Apellidos', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.apellidos;
      drawCell(xAcc, currentY, colWidths.seccion, 18, 'Sección', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.seccion;
      drawCell(xAcc, currentY, colWidths.estado, 18, 'Estado', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.estado;
      drawCell(xAcc, currentY, colWidths.firma, 18, 'Firma', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' });
      currentY += 18;
    };

    let currentY = 0;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text('INSTITUTO NACIONAL DE JUCUAPA', startX, 80, { align: 'center', width: pageWidth });
    doc.fontSize(8).font('Helvetica');
    doc.text('MINISTERIO DE EDUCACIÓN, CIENCIA Y TECNOLOGÍA', startX, 94, { align: 'center', width: pageWidth });
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('CONTROL DE ASISTENCIA', startX, 110, { align: 'center', width: pageWidth });

    const fechaStr = new Date(fecha).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.font('Helvetica').fontSize(8).fillColor('#333');
    const infoLine = `Fecha: ${fechaStr}  |  Sección: ${sectionName || '-'}  |  Año: ${yearName || '-'}  |  Total de alumnos: ${students.length}`;
    doc.text(infoLine, startX, 128, { align: 'center', width: pageWidth });

    currentY = 150;

    drawTableHeader();

    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;
    let sinRegistro = 0;

    let rowNum = 1;
    for (const st of students) {
      if (currentY + 16 > pageBottom) {
        doc.addPage();
        currentY = 70;
        try {
          doc.image(logoPath, 8, 12, { width: 55 });
        } catch (_e) {}
        drawTableHeader();
      }

      const estado = st.asistencia_estado;
      let estadoText = 'No registrado';
      if (estado) {
        estadoText = estadoMap[estado] || estado;
        if (estado === 'presente') presentes++;
        else if (estado === 'ausente') ausentes++;
        else if (estado === 'justificado') justificados++;
      } else {
        sinRegistro++;
      }

      let xAcc = startX;
      drawCell(xAcc, currentY, colWidths.no, 16, String(rowNum), { fontSize: 7.5, align: 'center' }); xAcc += colWidths.no;
      drawCell(xAcc, currentY, colWidths.id, 16, String(st.id), { fontSize: 7.5, align: 'center' }); xAcc += colWidths.id;
      drawCell(xAcc, currentY, colWidths.nombres, 16, st.nombre, { fontSize: 7.5 }); xAcc += colWidths.nombres;
      drawCell(xAcc, currentY, colWidths.apellidos, 16, st.apellido, { fontSize: 7.5 }); xAcc += colWidths.apellidos;
      drawCell(xAcc, currentY, colWidths.seccion, 16, sectionName || '-', { fontSize: 7.5 }); xAcc += colWidths.seccion;
      drawCell(xAcc, currentY, colWidths.estado, 16, estadoText, {
        fontSize: 7.5,
        align: 'center',
        bg: estado ? estadoBg[estado] || null : '#f3f4f6',
        textColor: estado ? estadoColor[estado] || '#000' : '#6b7280',
        bold: true,
      }); xAcc += colWidths.estado;
      drawCell(xAcc, currentY, colWidths.firma, 16, '', { fontSize: 7.5, align: 'center' });
      currentY += 16;
      rowNum++;
    }

    currentY += 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
    doc.text(
      `Resumen: Presentes: ${presentes}  |  Ausentes: ${ausentes}  |  Justificados: ${justificados}  |  Sin registrar: ${sinRegistro}`,
      startX,
      currentY,
      { align: 'left', width: pageWidth }
    );

    const bottomY = doc.page.height - 45;
    const nowStr = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
    const timeStr = new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange ? pageRange.count : 1;

    for (let i = 1; i <= totalPages; i++) {
      doc.switchToPage(i - 1);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#333');
      doc.text(`Instituto Nacional De Jucuapa  ${nowStr} ${timeStr}`, startX, bottomY);
      doc.text(`${i} / ${totalPages}`, startX, bottomY, { align: 'right', width: pageWidth });
    }

    doc.end();
  } catch (err) {
    next(err);
  }
};
