import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getStudents = async (req, res, next) => {
  try {
    let baseQuery = `FROM students st
                     LEFT JOIN sections s ON st.seccion_id = s.id
                     LEFT JOIN academic_years ay ON st.academic_year_id = ay.id
                     WHERE st.estado != 'egresado'`;
    let query = `SELECT st.*, s.nombre as seccion_nombre, ay.año as año_actual ${baseQuery}`;
    let countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const params = [];
    const countParams = [];

    if (req.query.seccion_id) {
      query += ' AND st.seccion_id = ?';
      countQuery += ' AND st.seccion_id = ?';
      params.push(req.query.seccion_id);
      countParams.push(req.query.seccion_id);
    }
    if (req.query.grado) {
      query += ' AND st.grado = ?';
      countQuery += ' AND st.grado = ?';
      params.push(req.query.grado);
      countParams.push(req.query.grado);
    }
    if (req.query.estado) {
      query += ' AND st.estado = ?';
      countQuery += ' AND st.estado = ?';
      params.push(req.query.estado);
      countParams.push(req.query.estado);
    }
    if (req.query.teacher_id) {
      query += ' AND st.seccion_id IN (SELECT section_id FROM teacher_assignments WHERE teacher_id = ? AND section_id IS NOT NULL)';
      countQuery += ' AND st.seccion_id IN (SELECT section_id FROM teacher_assignments WHERE teacher_id = ? AND section_id IS NOT NULL)';
      params.push(req.query.teacher_id);
      countParams.push(req.query.teacher_id);
    }
    if (req.query.search) {
      query += ' AND (st.nombre LIKE ? OR st.apellido LIKE ?)';
      countQuery += ' AND (st.nombre LIKE ? OR st.apellido LIKE ?)';
      const search = `%${req.query.search}%`;
      params.push(search, search);
      countParams.push(search, search);
    }

    query += ' ORDER BY st.apellido, st.nombre';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (req.query.page) {
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [students] = await pool.query(query, params);
    const [[{ total }]] = await pool.query(countQuery, countParams);

    if (req.query.page) {
      res.json({ data: students, total, page, limit, pages: Math.ceil(total / limit) });
    } else {
      res.json(students);
    }
  } catch (err) {
    next(err);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const [students] = await pool.query(
      `SELECT st.*, s.nombre as seccion_nombre, ay.año as año_actual
       FROM students st
       LEFT JOIN sections s ON st.seccion_id = s.id
       LEFT JOIN academic_years ay ON st.academic_year_id = ay.id
       WHERE st.id = ?`, [req.params.id]
    );
    if (students.length === 0) return res.status(404).json({ message: 'Alumno no encontrado' });
    res.json(students[0]);
  } catch (err) {
    next(err);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const { nombre, apellido, genero, seccion_id, grado, academic_year_id } = req.body;
    if (!nombre || !apellido || !grado) {
      return res.status(400).json({ message: 'Nombre, apellido y grado son requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO students (nombre, apellido, genero, seccion_id, grado, academic_year_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, apellido, genero || 'Masculino', seccion_id || null, grado, academic_year_id || null]
    );

    if (academic_year_id) {
      await pool.query(
        'INSERT INTO academic_records (student_id, academic_year_id, grado, seccion_id, estado) VALUES (?, ?, ?, ?, "cursando")',
        [result.insertId, academic_year_id, grado, seccion_id || null]
      );
    }

    res.status(201).json({ id: result.insertId, nombre, apellido, message: 'Alumno creado correctamente' });
  } catch (err) {
    next(err);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { nombre, apellido, genero, seccion_id, grado, estado } = req.body;
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Alumno no encontrado' });

    await pool.query(
      'UPDATE students SET nombre = ?, apellido = ?, genero = ?, seccion_id = ?, grado = ?, estado = ? WHERE id = ?',
      [
        nombre || existing[0].nombre,
        apellido || existing[0].apellido,
        genero !== undefined ? genero : existing[0].genero,
        seccion_id !== undefined ? seccion_id : existing[0].seccion_id,
        grado || existing[0].grado,
        estado || existing[0].estado,
        id
      ]
    );
    res.json({ message: 'Alumno actualizado correctamente' });
  } catch (err) {
    next(err);
  }
};

export const transferStudent = async (req, res, next) => {
  try {
    const { student_id, nueva_seccion_id } = req.body;
    if (!student_id || !nueva_seccion_id) {
      return res.status(400).json({ message: 'Student ID y nueva sección requeridos' });
    }
    const [student] = await pool.query('SELECT * FROM students WHERE id = ?', [student_id]);
    if (student.length === 0) return res.status(404).json({ message: 'Alumno no encontrado' });
    const [section] = await pool.query('SELECT * FROM sections WHERE id = ? AND activo = true', [nueva_seccion_id]);
    if (section.length === 0) return res.status(404).json({ message: 'Sección no encontrada' });

    const oldSectionId = student[0].seccion_id;
    await pool.query('UPDATE students SET seccion_id = ? WHERE id = ?', [nueva_seccion_id, student_id]);
    await pool.query('UPDATE academic_records SET seccion_id = ? WHERE student_id = ? AND estado = "cursando"', [nueva_seccion_id, student_id]);

    const [sectionName] = await pool.query('SELECT nombre FROM sections WHERE id = ?', [nueva_seccion_id]);
    res.json({
      message: `Alumno transferido de sección correctamente a ${sectionName[0].nombre}`,
      old_seccion_id: oldSectionId,
      new_seccion_id: nueva_seccion_id
    });
  } catch (err) {
    next(err);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Alumno no encontrado' });
    await pool.query('DELETE FROM students WHERE id = ?', [id]);
    res.json({ message: 'Alumno eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};

export const promoteStudents = async (req, res, next) => {
  try {
    const { academic_year_id, next_academic_year_id } = req.body;
    if (!academic_year_id || !next_academic_year_id) {
      return res.status(400).json({ message: 'Año actual y próximo año requeridos' });
    }

    const [records] = await pool.query(
      `SELECT ar.*, st.grado FROM academic_records ar
       JOIN students st ON ar.student_id = st.id
       WHERE ar.academic_year_id = ? AND ar.estado = "aprobado"`,
      [academic_year_id]
    );

    let promovidos = 0;
    let egresados = 0;

    for (const record of records) {
      const nextGrado = record.grado + 1;

      if (nextGrado > 3) {
        await pool.query('UPDATE students SET estado = "egresado" WHERE id = ?', [record.student_id]);
        await pool.query('UPDATE academic_records SET estado = "egresado" WHERE id = ?', [record.id]);
        egresados++;
      } else {
        const [existing] = await pool.query(
          'SELECT id FROM academic_records WHERE student_id = ? AND academic_year_id = ?',
          [record.student_id, next_academic_year_id]
        );
        if (existing.length > 0) continue;

        await pool.query(
          'UPDATE students SET grado = ?, academic_year_id = ? WHERE id = ?',
          [nextGrado, next_academic_year_id, record.student_id]
        );
        await pool.query(
          'INSERT INTO academic_records (student_id, academic_year_id, grado, seccion_id, estado) VALUES (?, ?, ?, ?, "cursando")',
          [record.student_id, next_academic_year_id, nextGrado, record.seccion_id]
        );
        promovidos++;
      }
    }

    res.json({ message: `Promoción completada: ${promovidos} promovidos, ${egresados} egresados`, total: promovidos + egresados });
  } catch (err) {
    next(err);
  }
};

export const generateStudentsListPDF = async (req, res, next) => {
  try {
    let baseQuery = `FROM students st
                     LEFT JOIN sections s ON st.seccion_id = s.id
                     LEFT JOIN academic_years ay ON st.academic_year_id = ay.id
                     WHERE st.estado != 'egresado'`;
    const params = [];

    if (req.query.seccion_id) {
      baseQuery += ' AND st.seccion_id = ?';
      params.push(req.query.seccion_id);
    }
    if (req.query.grado) {
      baseQuery += ' AND st.grado = ?';
      params.push(req.query.grado);
    }
    if (req.query.estado) {
      baseQuery += ' AND st.estado = ?';
      params.push(req.query.estado);
    }
    if (req.query.teacher_id) {
      baseQuery += ' AND st.seccion_id IN (SELECT section_id FROM teacher_assignments WHERE teacher_id = ? AND section_id IS NOT NULL)';
      params.push(req.query.teacher_id);
    }
    if (req.query.search) {
      baseQuery += ' AND (st.nombre LIKE ? OR st.apellido LIKE ?)';
      const search = `%${req.query.search}%`;
      params.push(search, search);
    }

    const [students] = await pool.query(
      `SELECT st.*, s.nombre as seccion_nombre, ay.año as año_actual ${baseQuery} ORDER BY st.apellido, st.nombre`,
      params
    );

    const doc = new PDFDocument({
      size: 'letter',
      margins: { top: 80, bottom: 40, left: 35, right: 35 },
      bufferPages: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="lista_alumnos.pdf"`);
    doc.pipe(res);

    const startX = 35;
    const pageWidth = doc.page.width - 70; // 542
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

    const colWidths = {
      no: 25,
      id: 45,
      nombres: 125,
      apellidos: 125,
      grado: 30,
      seccion: 90,
      estado: 60,
      año: 30,
    };

    let currentY = 0;

    const drawTableHeader = () => {
      let xAcc = startX;
      drawCell(xAcc, currentY, colWidths.no, 18, 'No.', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.no;
      drawCell(xAcc, currentY, colWidths.id, 18, 'Código', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.id;
      drawCell(xAcc, currentY, colWidths.nombres, 18, 'Nombres', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.nombres;
      drawCell(xAcc, currentY, colWidths.apellidos, 18, 'Apellidos', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.apellidos;
      drawCell(xAcc, currentY, colWidths.grado, 18, 'Grado', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.grado;
      drawCell(xAcc, currentY, colWidths.seccion, 18, 'Sección', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.seccion;
      drawCell(xAcc, currentY, colWidths.estado, 18, 'Estado', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' }); xAcc += colWidths.estado;
      drawCell(xAcc, currentY, colWidths.año, 18, 'Año', { bold: true, fontSize: 7.5, bg: '#DCE1E5', align: 'center' });
      currentY += 18;
    };

    // ENCABEZADO
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text('INSTITUTO NACIONAL DE JUCUAPA', startX, 80, { align: 'center', width: pageWidth });
    doc.fontSize(8).font('Helvetica');
    doc.text('MINISTERIO DE EDUCACIÓN, CIENCIA Y TECNOLOGÍA', startX, 94, { align: 'center', width: pageWidth });
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('LISTA DE ALUMNOS', startX, 110, { align: 'center', width: pageWidth });

    let filtersInfo = [];
    if (req.query.seccion_id) {
      const [sec] = await pool.query('SELECT nombre FROM sections WHERE id = ?', [req.query.seccion_id]);
      if (sec.length > 0) filtersInfo.push(`Sección: ${sec[0].nombre}`);
    }
    if (req.query.grado) filtersInfo.push(`Grado: ${req.query.grado}°`);
    if (req.query.estado) filtersInfo.push(`Estado: ${req.query.estado}`);
    if (req.query.search) filtersInfo.push(`Búsqueda: ${req.query.search}`);

    doc.font('Helvetica').fontSize(8).fillColor('#333');
    const todayStr = new Date().toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const infoLine = `Fecha: ${todayStr}  |  Total de alumnos: ${students.length}` + (filtersInfo.length > 0 ? `  |  ${filtersInfo.join('  |  ')}` : '');
    doc.text(infoLine, startX, 128, { align: 'center', width: pageWidth });

    currentY = 150;

    drawTableHeader();

    const estadoMap = {
      activo: 'Activo',
      retirado: 'Retirado',
      graduado: 'Graduado',
      egresado: 'Egresado',
    };

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

      let xAcc = startX;
      drawCell(xAcc, currentY, colWidths.no, 16, String(rowNum), { fontSize: 7.5, align: 'center' }); xAcc += colWidths.no;
      drawCell(xAcc, currentY, colWidths.id, 16, String(st.id), { fontSize: 7.5, align: 'center' }); xAcc += colWidths.id;
      drawCell(xAcc, currentY, colWidths.nombres, 16, st.nombre, { fontSize: 7.5 }); xAcc += colWidths.nombres;
      drawCell(xAcc, currentY, colWidths.apellidos, 16, st.apellido, { fontSize: 7.5 }); xAcc += colWidths.apellidos;
      drawCell(xAcc, currentY, colWidths.grado, 16, `${st.grado}°`, { fontSize: 7.5, align: 'center' }); xAcc += colWidths.grado;
      drawCell(xAcc, currentY, colWidths.seccion, 16, st.seccion_nombre || '-', { fontSize: 7.5 }); xAcc += colWidths.seccion;
      drawCell(xAcc, currentY, colWidths.estado, 16, estadoMap[st.estado] || st.estado, { fontSize: 7.5, align: 'center' }); xAcc += colWidths.estado;
      drawCell(xAcc, currentY, colWidths.año, 16, st.año_actual ? String(st.año_actual) : '-', { fontSize: 7.5, align: 'center' });
      currentY += 16;
      rowNum++;
    }

    // PIE DE PÁGINA
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
