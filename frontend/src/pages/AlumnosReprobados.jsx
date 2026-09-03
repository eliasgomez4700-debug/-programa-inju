import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AlumnosReprobados() {
  const { user } = useAuth();
  const [reprobados, setReprobados] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const canDelete = user?.rol === 'director' || user?.rol === 'subdirector';

  const load = async (params = {}) => {
    setLoading(true);
    try {
      const [rRes, yRes] = await Promise.all([
        API.get('/reprobados', { params }),
        API.get('/academic-years'),
      ]);
      setReprobados(rRes.data);
      setYears(yRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => {
    const params = {};
    if (search) params.search = search;
    if (filterYear) params.academic_year_id = filterYear;
    load(params);
  };

  const handleDelete = async (r) => {
    if (!confirm(`¿Eliminar a ${r.nombre} ${r.apellido} de la lista de reprobados?`)) return;
    try {
      await API.delete(`/reprobados/${r.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el registro');
    }
  };

  return (
    <div>
      <h1>Alumnos Reprobados</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
        Alumnos que al momento del cierre del sistema quedaron con promedio final menor a 6.0 y repiten el grado.
      </p>

      <div className="filters">
        <input placeholder="Buscar alumno..." value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">Todos los años</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
        <button className="btn btn-primary" onClick={handleSearch}>Buscar</button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : reprobados.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
            No hay alumnos reprobados registrados.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Género</th>
                <th>Grado</th>
                <th>Sección</th>
                <th>Promedio Final</th>
                <th>Año</th>
                {canDelete && <th>Acción</th>}
              </tr>
            </thead>
            <tbody>
              {reprobados.map(r => (
                <tr key={r.id}>
                  <td>{r.nombre}</td>
                  <td>{r.apellido}</td>
                  <td>{r.genero || '-'}</td>
                  <td>{r.grado}°</td>
                  <td>{r.seccion_nombre || '-'}</td>
                  <td><span className="badge badge-reprobado">{r.promedio_final}</span></td>
                  <td>{r.año || '-'}</td>
                  {canDelete && (
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r)}>
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
