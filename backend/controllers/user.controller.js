import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

export const getUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT id, nombre, email, rol, activo, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT id, nombre, email, rol, activo, created_at FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(users[0]);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, passwordHash, rol]
    );
    res.status(201).json({ id: result.insertId, nombre, email, rol, message: 'Usuario creado correctamente' });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { nombre, email, password, rol, activo } = req.body;
    const { id } = req.params;
    const [existing] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

    let query = 'UPDATE users SET nombre = ?, email = ?, rol = ?, activo = ?';
    const params = [nombre || existing[0].nombre, email || existing[0].email, rol || existing[0].rol, activo !== undefined ? activo : existing[0].activo];

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(passwordHash);
    }

    query += ' WHERE id = ?';
    params.push(id);
    await pool.query(query, params);
    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (req.user.id === id) {
      return res.status(400).json({ message: 'No puedes eliminar tu propio usuario' });
    }
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    next(err);
  }
};
