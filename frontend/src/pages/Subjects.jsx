import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ nombre: '', descripcion: '', tipo: 'basica' });
  const [filterTipo, setFilterTipo] = useState('');
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const params = {};
      if (filterTipo) params.tipo = filterTipo;
      const res = await API.get('/subjects', { params });
      setSubjects(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, [filterTipo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await API.put(`/subjects/${editing.id}`, form);
      } else {
        await API.post('/subjects', form);
      }
      setForm({ nombre: '', descripcion: '', tipo: 'basica' });
      setEditing(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (subject) => {
    setEditing(subject);
    setForm({ nombre: subject.nombre, descripcion: subject.descripcion || '', tipo: subject.tipo });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar la materia "${nombre}"?`)) return;
    try {
      await API.delete(`/subjects/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ nombre: '', descripcion: '', tipo: 'basica' });
  };

  return (
    <div>
      <h1>Materias</h1>
      <form onSubmit={handleSubmit} className="card form-card">
        <h3>{editing ? 'Editar Materia' : 'Nueva Materia'}</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Nombre de la Materia</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Tipo de Materia</label>
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
              <option value="basica">Básica</option>
              <option value="modulo">Módulo</option>
            </select>
          </div>
          <div className="form-group" />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{editing ? 'Actualizar' : 'Agregar Materia'}</button>
          {editing && <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancelar</button>}
        </div>
      </form>

      <div className="filters">
        <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="basica">Básicas</option>
          <option value="modulo">Módulo</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(s => (
              <tr key={s.id}>
                <td>{s.nombre}</td>
                <td>{s.descripcion || '-'}</td>
                <td>
                  <span className={`badge ${s.tipo === 'basica' ? 'badge-basica' : 'badge-modulo'}`}>
                    {s.tipo === 'basica' ? 'Básica' : 'Módulo'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-sm btn-primary" onClick={() => handleEdit(s)}>Editar</button>{' '}
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id, s.nombre)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
