import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ subject_id: '', section_id: '', grado: '' });

  useEffect(() => {
    API.get('/teachers').then(r => setTeachers(r.data)).catch(() => {});
    API.get('/subjects').then(r => setSubjects(r.data)).catch(() => {});
    API.get('/sections').then(r => setSections(r.data)).catch(() => {});
  }, []);

  const loadAssignments = async (teacherId) => {
    if (!teacherId) { setAssignments([]); return; }
    const res = await API.get(`/teachers/${teacherId}/assignments`);
    setAssignments(res.data);
  };

  const handleTeacherChange = (e) => {
    const id = e.target.value;
    setSelectedTeacher(id);
    setForm({ subject_id: '', section_id: '', grado: '' });
    loadAssignments(id);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await API.post('/teachers/assignments', {
        teacher_id: parseInt(selectedTeacher),
        subject_id: parseInt(form.subject_id),
        section_id: form.section_id ? parseInt(form.section_id) : null,
        grado: form.grado ? parseInt(form.grado) : null,
      });
      setForm({ subject_id: '', section_id: '', grado: '' });
      loadAssignments(selectedTeacher);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al agregar asignación');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta asignación?')) return;
    try {
      await API.delete(`/teachers/assignments/${id}`);
      loadAssignments(selectedTeacher);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  return (
    <div>
      <h1>Profesores</h1>
      <p>Asigna materias, secciones y grados a cada profesor para que puedan ingresar notas.</p>

      <div className="filters">
        <select value={selectedTeacher} onChange={handleTeacherChange}>
          <option value="">Seleccionar Profesor</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
      </div>

      {selectedTeacher && (
        <>
          <form onSubmit={handleAdd} className="card form-card">
            <h3>Agregar Asignación</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Materia</label>
                <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} required>
                  <option value="">Seleccionar</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Sección (opcional)</label>
                <select value={form.section_id} onChange={e => setForm({ ...form, section_id: e.target.value })}>
                  <option value="">Todas las secciones</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Grado (opcional)</label>
                <select value={form.grado} onChange={e => setForm({ ...form, grado: e.target.value })}>
                  <option value="">Todos los grados</option>
                  {[1, 2, 3].map(g => <option key={g} value={g}>{g}°</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Agregar</button>
          </form>

          <div className="table-container">
            <h3>Asignaciones de {teachers.find(t => t.id === parseInt(selectedTeacher))?.nombre}</h3>
            {assignments.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                Sin asignaciones aún
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Materia</th>
                    <th>Sección</th>
                    <th>Grado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a.id}>
                      <td>{a.subject_nombre}</td>
                      <td>{a.section_nombre || 'Todas'}</td>
                      <td>{a.grado ? `${a.grado}°` : 'Todos'}</td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
