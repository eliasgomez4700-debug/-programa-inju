import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getMerits = async (req, res, next) => {
  try {
    let query = `SELECT md.*, st.nombre as student_nombre, st.apellido as student_apellido
                 FROM merits_demerits md
                 JOIN students st ON md.student_id = st.id
                 WHERE 1=1`;
    const params = [];

    if (req.query.student_id) {
      query += ' AND md.student_id = ?';
      params.push(req.query.student_id);
    }
    if (req.query.tipo) {
      query += ' AND md.tipo = ?';
      params.push(req.query.tipo);
    }

    query += ' ORDER BY md.fecha DESC';
    const [merits] = await pool.query(query, params);
    res.json(merits);
  } catch (err) {
    next(err);
  }
};

export const getMeritSummary = async (req, res, next) => {
  try {
    const { student_id } = req.params;

    const [meritos] = await pool.query(
      "SELECT COUNT(*) as total FROM merits_demerits WHERE student_id = ? AND tipo = 'merito'",
      [student_id]
    );
    const [demeritos] = await pool.query(
      "SELECT COUNT(*) as total FROM merits_demerits WHERE student_id = ? AND tipo = 'demerito'",
      [student_id]
    );

    const totalDemeritos = demeritos[0].total;
    const sinDerechoGraduacion = totalDemeritos >= 15;

    res.json({
      student_id,
      meritos: meritos[0].total,
      demeritos: totalDemeritos,
      sin_derecho_graduacion: sinDerechoGraduacion,
      message: sinDerechoGraduacion ? 'El alumno ha alcanzado 15 o más deméritos y no tiene derecho a graduarse' : ''
    });
  } catch (err) {
    next(err);
  }
};

export const createMerit = async (req, res, next) => {
  try {
    const { student_id, tipo, descripcion, fecha } = req.body;
    if (!student_id || !tipo || !descripcion || !fecha) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    if (!['merito', 'demerito'].includes(tipo)) {
      return res.status(400).json({ message: 'El tipo debe ser "merito" o "demerito"' });
    }

    const [result] = await pool.query(
      'INSERT INTO merits_demerits (student_id, tipo, descripcion, fecha) VALUES (?, ?, ?, ?)',
      [student_id, tipo, descripcion, fecha]
    );

    const [summary] = await pool.query(
      "SELECT COUNT(*) as total FROM merits_demerits WHERE student_id = ? AND tipo = 'demerito'",
      [student_id]
    );

    let warning = null;
    if (tipo === 'demerito' && summary[0].total >= 15) {
      await pool.query('UPDATE students SET estado = "retirado" WHERE id = ?', [student_id]);
      warning = 'El alumno ha alcanzado 15 deméritos — fue marcado como retirado';
    }

    res.status(201).json({
      id: result.insertId,
      student_id,
      tipo,
      descripcion,
      fecha,
      total_demeritos: summary[0].total,
      warning,
      message: `${tipo === 'merito' ? 'Mérito' : 'Demérito'} registrado correctamente`
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMerit = async (req, res, next) => {
  try {
    const [result] = await pool.query('DELETE FROM merits_demerits WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' });
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};

export const generateMeritsPDF = async (req, res, next) => {
  try {
    let baseQuery = `FROM merits_demerits md
                     JOIN students st ON md.student_id = st.id
                     LEFT JOIN sections s ON st.seccion_id = s.id
                     WHERE 1=1`;
    const params = [];

    if (req.query.student_id) {
      baseQuery += ' AND md.student_id = ?';
      params.push(req.query.student_id);
    }
    if (req.query.tipo) {
      baseQuery += ' AND md.tipo = ?';
      params.push(req.query.tipo);
    }
    if (req.query.section_id) {
      baseQuery += ' AND st.seccion_id = ?';
      params.push(req.query.section_id);
    }
    if (req.query.grado) {
      baseQuery += ' AND st.grado = ?';
      params.push(req.query.grado);
    }

    const [merits] = await pool.query(
      `SELECT md.*, st.nombre as student_nombre, st.apellido as student_apellido, st.grado, s.nombre as seccion_nombre
       ${baseQuery} ORDER BY st.apellido, st.nombre, md.fecha DESC`,
      params
    );

    const doc = new PDFDocument({
      size: 'letter',
      margins: { top: 80, bottom: 40, left: 35, right: 35 },
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="meritos_demeritos.pdf"`);
    doc.pipe(res);

    const startX = 35;
    const pageWidth = doc.page.width - 70;
    const pageBottom = doc.page.height - 40;

    const logoPath = path.join(__dirname, '../../frontend/img/escudo.jpeg');
    try {
      doc.image(logoPath, 8, 12, { width: 55 });
    } catch (_e) {}

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

    const colWidths = {
      no: 25,
      alumno: 155,
      seccion: 80,
      grado: 30,
      tipo: 75,
      descripcion: 140,
      fecha: 55,
    };

    let currentY = 0;

    const drawTableHeader = () => {
      let xAcc = startX;
      drawCell(xAcc, currentY, colWidths.no, 18, 'No.', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.no;
      drawCell(xAcc, currentY, colWidths.alumno, 18, 'Alumno', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.alumno;
      drawCell(xAcc, currentY, colWidths.seccion, 18, 'Sección', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.seccion;
      drawCell(xAcc, currentY, colWidths.grado, 18, 'Grado', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.grado;
      drawCell(xAcc, currentY, colWidths.tipo, 18, 'Tipo', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.tipo;
      drawCell(xAcc, currentY, colWidths.descripcion, 18, 'Descripción', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.descripcion;
      drawCell(xAcc, currentY, colWidths.fecha, 18, 'Fecha', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' });
      currentY += 18;
    };

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text('INSTITUTO NACIONAL DE JUCUAPA', startX, 80, { align: 'center', width: pageWidth });
    doc.fontSize(8).font('Helvetica');
    doc.text('MINISTERIO DE EDUCACIÓN, CIENCIA Y TECNOLOGÍA', startX, 94, { align: 'center', width: pageWidth });
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('REGISTRO DE MÉRITOS Y DEMÉRITOS', startX, 110, { align: 'center', width: pageWidth });

    let filtersInfo = [];
    if (req.query.student_id) {
      const [stu] = await pool.query('SELECT nombre, apellido FROM students WHERE id = ?', [req.query.student_id]);
      if (stu.length > 0) filtersInfo.push(`Alumno: ${stu[0].nombre} ${stu[0].apellido}`);
    }
    if (req.query.section_id) {
      const [sec] = await pool.query('SELECT nombre FROM sections WHERE id = ?', [req.query.section_id]);
      if (sec.length > 0) filtersInfo.push(`Sección: ${sec[0].nombre}`);
    }
    if (req.query.grado) filtersInfo.push(`Grado: ${req.query.grado}°`);
    if (req.query.tipo) filtersInfo.push(`Tipo: ${req.query.tipo === 'merito' ? 'Mérito' : 'Demérito'}`);

    const totalMeritos = merits.filter(m => m.tipo === 'merito').length;
    const totalDemeritos = merits.filter(m => m.tipo === 'demerito').length;

    doc.font('Helvetica').fontSize(8).fillColor('#333');
    const todayStr = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const infoLine = `Fecha: ${todayStr}  |  Total de registros: ${merits.length}  |  Méritos: ${totalMeritos}  |  Deméritos: ${totalDemeritos}` + (filtersInfo.length > 0 ? `  |  ${filtersInfo.join('  |  ')}` : '');
    doc.text(infoLine, startX, 128, { align: 'center', width: pageWidth });

    currentY = 150;

    drawTableHeader();

    const tipoLabel = { merito: 'Mérito', demerito: 'Demérito' };

    let rowNum = 1;
    for (const m of merits) {
      if (currentY + 16 > pageBottom) {
        doc.addPage();
        currentY = 70;
        try {
          doc.image(logoPath, 8, 12, { width: 55 });
        } catch (_e) {}
        drawTableHeader();
      }

      let xAcc = startX;
      drawCell(xAcc, currentY, colWidths.no, 16, String(rowNum), { fontSize: 7.5, align: 'center' }); xAcc += colWidths.no;
      drawCell(xAcc, currentY, colWidths.alumno, 16, `${m.student_apellido}, ${m.student_nombre}`, { fontSize: 7.5 }); xAcc += colWidths.alumno;
      drawCell(xAcc, currentY, colWidths.seccion, 16, m.seccion_nombre || '-', { fontSize: 7.5 }); xAcc += colWidths.seccion;
      drawCell(xAcc, currentY, colWidths.grado, 16, `${m.grado}°`, { fontSize: 7.5, align: 'center' }); xAcc += colWidths.grado;
      drawCell(xAcc, currentY, colWidths.tipo, 16, tipoLabel[m.tipo] || m.tipo, {
        fontSize: 7.5,
        align: 'center',
        bold: m.tipo === 'demerito',
        textColor: m.tipo === 'demerito' ? '#B91C1C' : '#166534',
      }); xAcc += colWidths.tipo;
      drawCell(xAcc, currentY, colWidths.descripcion, 16, m.descripcion, { fontSize: 7.5 }); xAcc += colWidths.descripcion;
      drawCell(xAcc, currentY, colWidths.fecha, 16, new Date(m.fecha).toLocaleDateString('es-SV'), { fontSize: 7.5, align: 'center' });
      currentY += 16;
      rowNum++;
    }

    const bottomY = doc.page.height - 45;
    const nowStr = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
