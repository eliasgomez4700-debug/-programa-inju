import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';

export default function SectionSubjects() {
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const load = async () => {
    try {
      const [secRes, subRes] = await Promise.all([
        API.get('/sections'),
        API.get('/subjects'),
      ]);
      setSections(secRes.data);
      setSubjects(subRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const params = {};
      if (selectedSection) params.section_id = selectedSection;
      const res = await API.get('/section-subjects', { params });
      setAssignments(res.data);
    } catch (err) { console.error(err); }
  }, [selectedSection]);

  useEffect(() => {
    loadAssignments();
  }, [selectedSection, loadAssignments]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedSection || !selectedSubject) {
      alert('Selecciona sección y materia');
      return;
    }
    try {
      await API.post('/section-subjects', {
        section_id: parseInt(selectedSection),
        subject_id: parseInt(selectedSubject),
      });
      const assigned = subjects.find(s => s.id === parseInt(selectedSubject));
      setSelectedSubject('');
      await loadAssignments();
      alert(`Asignación guardada: ${assigned?.nombre || 'materia'}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al asignar');
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('¿Eliminar esta asignación?')) return;
    try {
      await API.delete(`/section-subjects/${id}`);
      await loadAssignments();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const filteredSubjects = subjects.filter(s => {
    if (subjectFilter && s.tipo !== subjectFilter) return false;
    return true;
  });

  const filteredAssignments = assignments.filter(a => {
    if (subjectFilter && a.subject_tipo !== subjectFilter) return false;
    return true;
  });

  return (
    <div>
      <h1>Asignación de Materias por Sección</h1>

      <form onSubmit={handleAssign} className="card form-card">
        <div className="form-row">
          <div className="form-group">
            <label>Sección</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} required>
              <option value="">Seleccionar Sección</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Filtrar por tipo</label>
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="basica">Básicas</option>
              <option value="modulo">Módulo</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Materia</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} required>
              <option value="">Seleccionar Materia</option>
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.tipo === 'basica' ? 'Básica' : 'Módulo'})
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Asignar Materia</button>
        <button type="button" className="btn btn-secondary" onClick={loadAssignments} style={{ marginLeft: '0.5rem' }}>
          Cargar Asignaciones
        </button>
      </form>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Sección</th>
              <th>Materia</th>
              <th>Tipo</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                  No hay asignaciones. Selecciona sección y presiona "Cargar Asignaciones".
                </td>
              </tr>
            ) : (
              filteredAssignments.map(a => (
                <tr key={a.id}>
                  <td>{a.section_nombre}</td>
                  <td>{a.subject_nombre}</td>
                  <td>
                    <span className={`badge ${a.subject_tipo === 'basica' ? 'badge-basica' : 'badge-modulo'}`}>
                      {a.subject_tipo === 'basica' ? 'Básica' : 'Módulo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleRemove(a.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
