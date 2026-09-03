import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const initDB = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'inju_control_notas'}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.query(`USE \`${process.env.DB_NAME || 'inju_control_notas'}\`;`);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      rol ENUM('director', 'subdirector', 'secretaria', 'profesor') NOT NULL,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS sections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS academic_years (
      id INT AUTO_INCREMENT PRIMARY KEY,
      año YEAR NOT NULL,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      descripcion TEXT,
      tipo ENUM('basica', 'modulo') DEFAULT 'basica',
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const [colExists] = await connection.query("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subjects' AND COLUMN_NAME = 'tipo'");
  if (colExists[0].cnt === 0) {
    await connection.query("ALTER TABLE subjects ADD COLUMN tipo ENUM('basica', 'modulo') DEFAULT 'basica' AFTER descripcion");
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS periods (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(50) NOT NULL,
      numero INT NOT NULL,
      academic_year_id INT NOT NULL,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      apellido VARCHAR(100) NOT NULL,
      genero ENUM('Masculino', 'Femenino') DEFAULT 'Masculino',
      seccion_id INT,
      grado INT NOT NULL,
      estado ENUM('activo', 'graduado', 'retirado', 'egresado') DEFAULT 'activo',
      academic_year_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (seccion_id) REFERENCES sections(id) ON DELETE SET NULL,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      subject_id INT NOT NULL,
      period_id INT NOT NULL,
      nota1 DECIMAL(5,2) DEFAULT 0,
      nota2 DECIMAL(5,2) DEFAULT 0,
      nota3 DECIMAL(5,2) DEFAULT 0,
      recuperacion DECIMAL(5,2) DEFAULT 0,
      refuerzo DECIMAL(5,2) DEFAULT 0,
      promedio DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
      UNIQUE KEY unique_grade (student_id, subject_id, period_id)
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      academic_year_id INT NOT NULL,
      fecha DATE NOT NULL,
      estado ENUM('presente', 'ausente', 'justificado') DEFAULT 'presente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      UNIQUE KEY unique_attendance (student_id, fecha)
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS merits_demerits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      tipo ENUM('merito', 'demerito') NOT NULL,
      descripcion TEXT NOT NULL,
      fecha DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      teacher_id INT NOT NULL,
      subject_id INT NOT NULL,
      section_id INT,
      grado INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL,
      UNIQUE KEY unique_assignment (teacher_id, subject_id, section_id, grado)
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS academic_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      academic_year_id INT NOT NULL,
      grado INT NOT NULL,
      seccion_id INT,
      estado ENUM('cursando', 'aprobado', 'reprobado', 'egresado') DEFAULT 'cursando',
      promedio_final DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      FOREIGN KEY (seccion_id) REFERENCES sections(id) ON DELETE SET NULL
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS section_subjects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      section_id INT NOT NULL,
      subject_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE KEY unique_section_subject (section_id, subject_id)
    );
  `);

  const [hasAcadYear] = await connection.query("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'section_subjects' AND COLUMN_NAME = 'academic_year_id'");
  if (hasAcadYear[0].cnt > 0) {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    await connection.query("ALTER TABLE section_subjects DROP COLUMN academic_year_id");
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS module_grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      subject_id INT NOT NULL,
      academic_year_id INT NOT NULL,
      preparacion_nota1 DECIMAL(5,2) DEFAULT 0,
      preparacion_nota2 DECIMAL(5,2) DEFAULT 0,
      preparacion_nota3 DECIMAL(5,2) DEFAULT 0,
      ejecucion_nota1 DECIMAL(5,2) DEFAULT 0,
      ejecucion_nota2 DECIMAL(5,2) DEFAULT 0,
      ejecucion_nota3 DECIMAL(5,2) DEFAULT 0,
      evaluacion_nota1 DECIMAL(5,2) DEFAULT 0,
      evaluacion_nota2 DECIMAL(5,2) DEFAULT 0,
      evaluacion_nota3 DECIMAL(5,2) DEFAULT 0,
      promedio DECIMAL(5,2) DEFAULT 0,
      nivel_logro INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      UNIQUE KEY unique_module_grade (student_id, subject_id, academic_year_id)
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS attitude_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      period_id INT NOT NULL,
      convivencia_cultura_paz ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno',
      decision_autonoma ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno',
      expresion_respeto ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno',
      pertenencia_cultura ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno',
      evaluador_id INT NOT NULL,
      observaciones TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
      FOREIGN KEY (evaluador_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_attitude (student_id, period_id)
    );
  `);

  const [hasConvivencia] = await connection.query("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attitude_reports' AND COLUMN_NAME = 'convivencia_cultura_paz'");
  if (hasConvivencia[0].cnt === 0) {
    await connection.query("ALTER TABLE attitude_reports DROP COLUMN calificacion");
    await connection.query("ALTER TABLE attitude_reports ADD COLUMN convivencia_cultura_paz ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno' AFTER period_id");
    await connection.query("ALTER TABLE attitude_reports ADD COLUMN decision_autonoma ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno' AFTER convivencia_cultura_paz");
    await connection.query("ALTER TABLE attitude_reports ADD COLUMN expresion_respeto ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno' AFTER decision_autonoma");
    await connection.query("ALTER TABLE attitude_reports ADD COLUMN pertenencia_cultura ENUM('bueno', 'muy_bueno', 'excelente') NOT NULL DEFAULT 'bueno' AFTER expresion_respeto");
  }

  const [hasPreparacion] = await connection.query("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'module_grades' AND COLUMN_NAME = 'preparacion_nota1'");
  if (hasPreparacion[0].cnt === 0) {
    await connection.query("ALTER TABLE module_grades DROP COLUMN actividad1");
    await connection.query("ALTER TABLE module_grades DROP COLUMN actividad2");
    await connection.query("ALTER TABLE module_grades DROP COLUMN actividad3");
    await connection.query("ALTER TABLE module_grades ADD COLUMN preparacion_nota1 DECIMAL(5,2) DEFAULT 0 AFTER academic_year_id");
    await connection.query("ALTER TABLE module_grades ADD COLUMN preparacion_nota2 DECIMAL(5,2) DEFAULT 0 AFTER preparacion_nota1");
    await connection.query("ALTER TABLE module_grades ADD COLUMN preparacion_nota3 DECIMAL(5,2) DEFAULT 0 AFTER preparacion_nota2");
    await connection.query("ALTER TABLE module_grades ADD COLUMN ejecucion_nota1 DECIMAL(5,2) DEFAULT 0 AFTER preparacion_nota3");
    await connection.query("ALTER TABLE module_grades ADD COLUMN ejecucion_nota2 DECIMAL(5,2) DEFAULT 0 AFTER ejecucion_nota1");
    await connection.query("ALTER TABLE module_grades ADD COLUMN ejecucion_nota3 DECIMAL(5,2) DEFAULT 0 AFTER ejecucion_nota2");
    await connection.query("ALTER TABLE module_grades ADD COLUMN evaluacion_nota1 DECIMAL(5,2) DEFAULT 0 AFTER ejecucion_nota3");
    await connection.query("ALTER TABLE module_grades ADD COLUMN evaluacion_nota2 DECIMAL(5,2) DEFAULT 0 AFTER evaluacion_nota1");
    await connection.query("ALTER TABLE module_grades ADD COLUMN evaluacion_nota3 DECIMAL(5,2) DEFAULT 0 AFTER evaluacion_nota2");
    await connection.query("ALTER TABLE module_grades ADD COLUMN nivel_logro INT DEFAULT 1 AFTER promedio");
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS reprobados (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      academic_year_id INT NOT NULL,
      grado INT NOT NULL,
      seccion_id INT,
      promedio_final DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      FOREIGN KEY (seccion_id) REFERENCES sections(id) ON DELETE SET NULL,
      UNIQUE KEY unique_reprobado (student_id, academic_year_id)
    );
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS recovery_grades (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      subject_id INT NOT NULL,
      academic_year_id INT NOT NULL,
      pp DECIMAL(5,2) DEFAULT 0,
      ni DECIMAL(5,2) DEFAULT 0,
      pps DECIMAL(5,2) DEFAULT 0,
      sp DECIMAL(5,2) DEFAULT 0,
      sps DECIMAL(5,2) DEFAULT 0,
      nf DECIMAL(5,2) DEFAULT 0,
      estado ENUM('aprobado', 'reprobado', 'pendiente') DEFAULT 'pendiente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      UNIQUE KEY unique_recovery_grade (student_id, subject_id, academic_year_id)
    );
  `);

  const passwordHash = await bcrypt.hash('admin123', 10);
  await connection.query(`
    INSERT IGNORE INTO users (nombre, email, password, rol)
    VALUES ('Director', 'director@inju.com', ?, 'director');
  `, [passwordHash]);

  console.log('Base de datos inicializada correctamente.');
  await connection.end();
  process.exit(0);
};

initDB().catch(err => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});
