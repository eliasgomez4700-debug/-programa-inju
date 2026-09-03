import { useState, useEffect } from 'react';
import API from '../api/axios';

const COMPETENCIAS = {
  convivencia_cultura_paz: 'Evidencia actitudes favorables para la convivencia y cultura de paz',
  decision_autonoma: 'Toma decisiones de forma autónoma y responsable',
  expresion_respeto: 'Se expresa y participa con respeto',
  pertenencia_cultura: 'Muestra sentido de pertenencia y respeto por nuestra cultura',
};

const CALIFICACION_LABELS = {
  bueno: 'Bueno',
  muy_bueno: 'Muy Bueno',
  excelente: 'Excelente',
};

export default function AttitudeReports() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [years, setYears] = useState([]);
  const [reports, setReports] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const [form, setForm] = useState({
    convivencia_cultura_paz: 'bueno',
    decision_autonoma: 'bueno',
    expresion_respeto: 'bueno',
    pertenencia_cultura: 'bueno',
    observaciones: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/academic-years').then(r => setYears(r.data)).catch(() => {});
    API.get('/sections').then(r => setSections(r.data)).catch(() => {});
    API.get('/students').then(r => setStudents(r.data)).catch(() => {});
  }, []);

  const loadPeriods = async (yearId) => {
    if (!yearId) { setPeriods([]); return; }
    const res = await API.get(`/academic-years/${yearId}/periods`);
    setPeriods(res.data);
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedPeriod) params.period_id = selectedPeriod;
      if (selectedSection) params.seccion_id = selectedSection;
      if (selectedGrade) params.grado = selectedGrade;
      if (selectedStudent) params.student_id = selectedStudent;
      const res = await API.get('/attitude-reports', { params });
      setReports(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingReport = async (studentId, periodId) => {
    if (!studentId || !periodId) return;
    try {
      const res = await API.get(`/attitude-reports/student/${studentId}/period/${periodId}`);
      if (res.data) {
        setForm({
          convivencia_cultura_paz: res.data.convivencia_cultura_paz,
          decision_autonoma: res.data.decision_autonoma,
          expresion_respeto: res.data.expresion_respeto,
          pertenencia_cultura: res.data.pertenencia_cultura,
          observaciones: res.data.observaciones || '',
        });
      } else {
        setForm({ convivencia_cultura_paz: 'bueno', decision_autonoma: 'bueno', expresion_respeto: 'bueno', pertenencia_cultura: 'bueno', observaciones: '' });
      }
    } catch {
      setForm({ convivencia_cultura_paz: 'bueno', decision_autonoma: 'bueno', expresion_respeto: 'bueno', pertenencia_cultura: 'bueno', observaciones: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedPeriod) {
      alert('Selecciona un alumno y un periodo');
      return;
    }
    try {
      await API.post('/attitude-reports', {
        student_id: parseInt(selectedStudent),
        period_id: parseInt(selectedPeriod),
        competencias: {
          convivencia_cultura_paz: form.convivencia_cultura_paz,
          decision_autonoma: form.decision_autonoma,
          expresion_respeto: form.expresion_respeto,
          pertenencia_cultura: form.pertenencia_cultura,
        },
        observaciones: form.observaciones,
      });
      loadReports();
      alert('Reporte de actitud guardado correctamente');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este reporte de actitud?')) return;
    try {
      await API.delete(`/attitude-reports/${id}`);
      loadReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleYearChange = (e) => {
    const yearId = e.target.value;
    setSelectedYear(yearId);
    setSelectedPeriod('');
    setPeriods([]);
    setReports([]);
    loadPeriods(yearId);
  };

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
    setSelectedStudent('');
    setForm({ convivencia_cultura_paz: 'bueno', decision_autonoma: 'bueno', expresion_respeto: 'bueno', pertenencia_cultura: 'bueno', observaciones: '' });
    loadReports();
  };

  const handleStudentChange = (e) => {
    const studentId = e.target.value;
    setSelectedStudent(studentId);
    if (studentId && selectedPeriod) {
      loadExistingReport(studentId, selectedPeriod);
    } else {
      setForm({ convivencia_cultura_paz: 'bueno', decision_autonoma: 'bueno', expresion_respeto: 'bueno', pertenencia_cultura: 'bueno', observaciones: '' });
    }
  };

  const filteredStudents = students.filter(s => {
    if (s.estado !== 'activo') return false;
    if (selectedSection && s.seccion_id !== parseInt(selectedSection)) return false;
    if (selectedGrade && s.grado !== parseInt(selectedGrade)) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Reportes de Actitud</h1>
      </div>
      <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
        Evalúa la actitud de cada alumno durante el periodo seleccionado.
      </p>

      <div className="filters">
        <select value={selectedYear} onChange={handleYearChange}>
          <option value="">Seleccionar Año</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
        <select value={selectedPeriod} onChange={handlePeriodChange} disabled={!selectedYear}>
          <option value="">Seleccionar Periodo</option>
          {periods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setSelectedStudent(''); loadReports(); }}>
          <option value="">Todas las secciones</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedStudent(''); loadReports(); }}>
          <option value="">Todos los grados</option>
          {[1, 2, 3].map(g => <option key={g} value={g}>{g}°</option>)}
        </select>
      </div>

      {selectedPeriod && (
        <div className="filters">
          <select value={selectedStudent} onChange={handleStudentChange}>
            <option value="">Seleccionar Alumno</option>
            {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
          </select>
        </div>
      )}

      {selectedStudent && (
        <form onSubmit={handleSubmit} className="card form-card">
          <h3 style={{ marginBottom: '1rem' }}>Evaluar Actitud</h3>
          {Object.entries(COMPETENCIAS).map(([key, label]) => (
            <div className="form-group" key={key}>
              <label>{label}</label>
              <div className="attitude-options">
                {Object.entries(CALIFICACION_LABELS).map(([value, lbl]) => (
                  <label key={value} className={`attitude-option ${form[key] === value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={key}
                      value={value}
                      checked={form[key] === value}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                    />
                    <span className={`attitude-label attitude-${value}`}>{lbl}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="form-group">
            <label>Observaciones (opcional)</label>
            <textarea
              value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Comentarios sobre la actitud del alumno..."
            />
          </div>
          <button type="submit" className="btn btn-primary">Guardar Reporte</button>
        </form>
      )}

      <div className="table-container">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : reports.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
            {selectedPeriod ? 'No hay reportes de actitud registrados para los filtros seleccionados.' : 'Selecciona un periodo para ver los reportes.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Periodo</th>
                <th>Convivencia y Cultura de Paz</th>
                <th>Decisión Autónoma</th>
                <th>Expresión y Respeto</th>
                <th>Pertenencia y Cultura</th>
                <th>Observaciones</th>
                <th>Evaluado por</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>{r.student_nombre} {r.student_apellido}</td>
                  <td>{r.period_nombre}</td>
                  <td><span className={`badge badge-attitude-${r.convivencia_cultura_paz}`}>{CALIFICACION_LABELS[r.convivencia_cultura_paz]}</span></td>
                  <td><span className={`badge badge-attitude-${r.decision_autonoma}`}>{CALIFICACION_LABELS[r.decision_autonoma]}</span></td>
                  <td><span className={`badge badge-attitude-${r.expresion_respeto}`}>{CALIFICACION_LABELS[r.expresion_respeto]}</span></td>
                  <td><span className={`badge badge-attitude-${r.pertenencia_cultura}`}>{CALIFICACION_LABELS[r.pertenencia_cultura]}</span></td>
                  <td>{r.observaciones || '-'}</td>
                  <td>{r.evaluador_nombre}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
