import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSec, setFilterSec] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedSec, setAppliedSec] = useState('');
  const [appliedGrade, setAppliedGrade] = useState('');
  const [form, setForm] = useState({ nombre: '', apellido: '', genero: 'Masculino', seccion_id: '', grado: 1, academic_year_id: '' });

  const load = async (params = {}) => {
    try {
      const [sRes, stRes, yRes] = await Promise.all([
        API.get('/sections'),
        API.get('/students', { params }),
        API.get('/academic-years'),
      ]);
      setSections(sRes.data);
      setStudents(stRes.data);
      setYears(yRes.data);
    } catch (err) { console.error(err); }
  };

  const handleSearch = () => {
    const params = {};
    if (search) params.search = search;
    if (filterSec) params.seccion_id = filterSec;
    if (filterGrade) params.grado = filterGrade;
    setAppliedSearch(search);
    setAppliedSec(filterSec);
    setAppliedGrade(filterGrade);
    load(params);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/students', form);
      setForm({ nombre: '', apellido: '', genero: 'Masculino', seccion_id: '', grado: 1, academic_year_id: '' });
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await API.put(`/students/${id}`, { estado: newStatus });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const downloadPDF = async () => {
    try {
      const params = {};
      if (appliedSearch) params.search = appliedSearch;
      if (appliedSec) params.seccion_id = appliedSec;
      if (appliedGrade) params.grado = appliedGrade;
      const res = await API.get('/students/pdf', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lista_alumnos.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al generar el PDF');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Alumnos</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={downloadPDF}>Descargar PDF</button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Nuevo Alumno'}
          </button>
        </div>
      </div>

      <div className="filters">
        <input placeholder="Buscar alumno..." value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <select value={filterSec} onChange={e => setFilterSec(e.target.value)}>
          <option value="">Todas las secciones</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
          <option value="">Todos los grados</option>
          {[1, 2, 3].map(g => <option key={g} value={g}>{g}°</option>)}
        </select>
        <button className="btn btn-primary" onClick={handleSearch}>Buscar</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Género</label>
              <select value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>
            <div className="form-group">
              <label>Grado</label>
              <select value={form.grado} onChange={e => setForm({ ...form, grado: e.target.value })}>
                {[1, 2, 3].map(g => <option key={g} value={g}>{g}°</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Sección</label>
              <select value={form.seccion_id} onChange={e => setForm({ ...form, seccion_id: e.target.value })}>
                <option value="">Sin sección</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Año Académico</label>
              <select value={form.academic_year_id} onChange={e => setForm({ ...form, academic_year_id: e.target.value })}>
                <option value="">Seleccionar</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">Guardar</button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Género</th>
                <th>Sección</th>
                <th>Grado</th>
                <th>Estado</th>
                <th>Año</th>
                <th>Acción</th>
              </tr>
          </thead>
          <tbody>
            {students.map(st => (
              <tr key={st.id}>
                <td>{st.nombre}</td>
                <td>{st.apellido}</td>
                <td>{st.genero || '-'}</td>
                <td>{st.seccion_nombre || '-'}</td>
                <td>{st.grado}°</td>
                <td><span className={`badge badge-${st.estado}`}>{st.estado}</span></td>
                <td>{st.año_actual || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {st.estado === 'activo' ? (
                      <button className="btn btn-sm btn-danger" onClick={() => changeStatus(st.id, 'retirado')}>
                        Retirar
                      </button>
                    ) : st.estado === 'retirado' ? (
                      <button className="btn btn-sm btn-success" onClick={() => changeStatus(st.id, 'activo')}>
                        Activar
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{st.estado}</span>
                    )}
                    <button className="btn btn-sm btn-danger" onClick={() => {
                      if (confirm(`¿Eliminar a ${st.nombre} ${st.apellido}? Esta acción no se puede deshacer.`)) {
                        API.delete(`/students/${st.id}`).then(() => load()).catch(err => alert(err.response?.data?.message || 'Error al eliminar'));
                      }
                    }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
