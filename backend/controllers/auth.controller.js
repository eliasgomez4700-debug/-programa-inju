import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }
    const [users] = await pool.query('SELECT * FROM users WHERE email = ? AND activo = true', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT id, nombre, email, rol, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(users[0]);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Contraseña actual y nueva contraseña son requeridas' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const valid = await bcrypt.compare(current_password, users[0].password);
    if (!valid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }
    const passwordHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, req.user.id]);
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    next(err);
  }
};
