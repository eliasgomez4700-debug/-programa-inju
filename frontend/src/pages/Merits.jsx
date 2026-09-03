import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Merits() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [merits, setMerits] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ student_id: '', tipo: 'merito', descripcion: '', fecha: new Date().toISOString().split('T')[0] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/students').then(r => setStudents(r.data)).catch(() => {});
    API.get('/sections').then(r => setSections(r.data)).catch(() => {});
  }, []);

  const filteredStudents = students.filter(s => {
    if (selectedSection && s.seccion_id !== parseInt(selectedSection)) return false;
    if (selectedGrade && s.grado !== parseInt(selectedGrade)) return false;
    return true;
  });

  const loadMerits = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedStudent) params.student_id = selectedStudent;
      const res = await API.get('/merits', { params });
      setMerits(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (studentId) => {
    if (!studentId) { setSummary(null); return; }
    const res = await API.get(`/merits/summary/${studentId}`);
    setSummary(res.data);
  };

  const handleStudentChange = (e) => {
    const studentId = e.target.value;
    setSelectedStudent(studentId);
    setForm(prev => ({ ...prev, student_id: studentId }));
    loadSummary(studentId);
    if (studentId) loadMerits();
    else setMerits([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/merits', form);
      setForm(prev => ({ ...prev, descripcion: '' }));
      loadMerits();
      loadSummary(form.student_id);
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await API.delete(`/merits/${id}`);
      loadMerits();
      if (selectedStudent) loadSummary(selectedStudent);
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const params = {};
      if (selectedStudent) params.student_id = selectedStudent;
      if (selectedSection) params.section_id = selectedSection;
      if (selectedGrade) params.grado = selectedGrade;
      const res = await API.get('/merits/pdf', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'meritos_demeritos.pdf');
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
        <h1>Méritos y Deméritos</h1>
        <button className="btn btn-primary" onClick={handleDownloadPDF}>Descargar PDF</button>
      </div>
      <p>Al llegar a 15 deméritos, el alumno es marcado como retirado automáticamente.</p>

      <div className="filters">
        <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setSelectedStudent(''); setMerits([]); setSummary(null); }}>
          <option value="">Todas las secciones</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedStudent(''); setMerits([]); setSummary(null); }}>
          <option value="">Todos los grados</option>
          {[1, 2, 3].map(g => <option key={g} value={g}>{g}°</option>)}
        </select>
        <select value={selectedStudent} onChange={handleStudentChange}>
          <option value="">Seleccionar Alumno</option>
          {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
        </select>
      </div>

      {summary && (
        <div className={`card summary-card ${summary.sin_derecho_graduacion ? 'danger' : 'success'}`}>
          <p><strong>Méritos:</strong> {summary.meritos} | <strong>Deméritos:</strong> {summary.demeritos}/15</p>
          {summary.sin_derecho_graduacion && (
            <p className="warning-text">⚠ {summary.message}</p>
          )}
        </div>
      )}

      {selectedStudent && (
        <form onSubmit={handleSubmit} className="card form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                <option value="merito">Mérito</option>
                <option value="demerito">Demérito</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary">Agregar</button>
        </form>
      )}

      <div className="table-container">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : merits.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
            {selectedStudent ? 'No hay méritos o deméritos registrados para este alumno.' : 'Selecciona un alumno para ver sus registros.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {merits.map(m => (
                <tr key={m.id}>
                  <td>{m.student_nombre} {m.student_apellido}</td>
                  <td><span className={`badge badge-${m.tipo}`}>{m.tipo}</span></td>
                  <td>{m.descripcion}</td>
                  <td>{new Date(m.fecha).toLocaleDateString()}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
