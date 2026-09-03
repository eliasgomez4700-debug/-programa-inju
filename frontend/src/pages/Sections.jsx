import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Sections() {
  const [sections, setSections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });

  const load = async () => {
    try {
      const res = await API.get('/sections');
      setSections(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/sections/${editingId}`, form);
      } else {
        await API.post('/sections', form);
      }
      setForm({ nombre: '', descripcion: '' });
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const startEdit = (section) => {
    setEditingId(section.id);
    setForm({ nombre: section.nombre, descripcion: section.descripcion || '' });
    setShowForm(true);
  };

  const cancelForm = () => {
    setForm({ nombre: '', descripcion: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta sección? (solo si no tiene alumnos activos)')) return;
    try {
      await API.delete(`/sections/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Secciones</h1>
        <button className="btn btn-primary" onClick={() => { if (showForm) cancelForm(); else setShowForm(true); }}>
          {showForm ? 'Cancelar' : 'Nueva Sección'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card">
          <h3>{editingId ? 'Editar Sección' : 'Nueva Sección'}</h3>
          <div className="form-group">
            <label>Nombre de la Sección</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
            <button type="button" className="btn btn-secondary" onClick={cancelForm}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Alumnos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sections.map(s => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td>{s.descripcion || '-'}</td>
                <td>{s.total_alumnos}</td>
                <td style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-sm btn-primary" onClick={() => startEdit(s)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
