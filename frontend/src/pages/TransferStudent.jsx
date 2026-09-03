import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function TransferStudent() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [filterSec, setFilterSec] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [nuevaSeccion, setNuevaSeccion] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/students'),
      API.get('/sections'),
      API.get('/academic-years'),
    ]).then(([sRes, secRes, yRes]) => {
      setStudents(sRes.data);
      setSections(secRes.data);
      setYears(yRes.data);
    }).catch(() => {});
  }, []);

  const filteredStudents = students.filter(s => {
    if (s.estado !== 'activo') return false;
    if (filterSec && s.seccion_id !== parseInt(filterSec)) return false;
    if (filterYear && s.academic_year_id !== parseInt(filterYear)) return false;
    return true;
  });

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !nuevaSeccion) return;
    setLoading(true);
    try {
      const res = await API.post('/students/transfer', {
        student_id: selectedStudent.id,
        nueva_seccion_id: nuevaSeccion,
      });
      setResult(res.data);
      setSelectedStudent(null);
      setNuevaSeccion('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Cambiar Alumno de Sección</h1>

      <div className="filters">
        <select value={filterSec} onChange={e => { setFilterSec(e.target.value); setSelectedStudent(null); }}>
          <option value="">Todas las secciones</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setSelectedStudent(null); }}>
          <option value="">Todos los años</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
      </div>

      <div className="table-container" style={{ marginTop: '1rem' }}>
        {filteredStudents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
            No hay alumnos activos con esos filtros.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Sección Actual</th>
                <th>Grado</th>
                <th>Año</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => (
                <tr key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={selectedStudent?.id === s.id ? 'selected-row' : ''}
                  style={{ cursor: 'pointer' }}>
                  <td>
                    <input type="radio" name="student"
                      checked={selectedStudent?.id === s.id}
                      onChange={() => setSelectedStudent(s)} />
                  </td>
                  <td>{s.nombre}</td>
                  <td>{s.apellido}</td>
                  <td>{s.seccion_nombre || 'Sin sección'}</td>
                  <td>{s.grado}°</td>
                  <td>{s.año_actual || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedStudent && (
        <form onSubmit={handleTransfer} className="card form-card" style={{ marginTop: '1rem' }}>
          <h3>Transferir: {selectedStudent.nombre} {selectedStudent.apellido}</h3>
          <p style={{ margin: '0.5rem 0', color: 'var(--text-light)' }}>
            Sección actual: <strong>{selectedStudent.seccion_nombre || 'Sin sección'}</strong> | Grado: <strong>{selectedStudent.grado}°</strong>
          </p>
          <div className="form-group">
            <label>Nueva Sección</label>
            <select value={nuevaSeccion} onChange={e => setNuevaSeccion(e.target.value)} required>
              <option value="">Seleccionar Sección</option>
              {sections.map(sec => (
                <option key={sec.id} value={sec.id}>{sec.nombre}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Cambiando...' : 'Cambiar Sección'}
          </button>
        </form>
      )}

      {result && (
        <div className="card success" style={{ marginTop: '1rem' }}>
          <p>{result.message}</p>
        </div>
      )}
    </div>
  );
}
