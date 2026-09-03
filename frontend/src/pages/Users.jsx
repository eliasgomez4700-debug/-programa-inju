import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'profesor' });

  const loadUsers = async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const resetForm = () => {
    setForm({ nombre: '', email: '', password: '', rol: 'profesor' });
    setEditingUser(null);
    setShowForm(false);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({ nombre: user.nombre, email: user.email, password: '', rol: user.rol });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const body = { nombre: form.nombre, email: form.email, rol: form.rol };
        if (form.password) body.password = form.password;
        await API.put(`/users/${editingUser.id}`, body);
      } else {
        await API.post('/users', form);
      }
      resetForm();
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar definitivamente este usuario? Esta acción no se puede deshacer.')) return;
    try {
      await API.delete(`/users/${id}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Usuarios</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card">
          <h3>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <div className="form-group">
            <label>Nombre</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Contraseña {editingUser && <span style={{ color: 'var(--text-light)', fontSize: '0.8em' }}>(dejar vacío para mantener)</span>}</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editingUser} />
          </div>
          <div className="form-group">
            <label>Rol</label>
            <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}>
              <option value="profesor">Profesor</option>
              <option value="secretaria">Secretaria</option>
              <option value="subdirector">Sub-Director</option>
              <option value="director">Director</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td><span className={`badge badge-${u.rol}`}>{u.rol}</span></td>
                <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => handleEdit(u)} style={{ marginRight: '0.5rem' }}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
