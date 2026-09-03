import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Attendance() {
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [savedMap, setSavedMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [summary, setSummary] = useState(null);
  const [selectedSummaryStudent, setSelectedSummaryStudent] = useState('');

  useEffect(() => {
    API.get('/academic-years').then(r => setYears(r.data)).catch(() => {});
    API.get('/sections').then(r => setSections(r.data)).catch(() => {});
  }, []);

  const loadStudents = async () => {
    if (!selectedSection || !selectedYear) return;
    setLoading(true);
    try {
      const res = await API.get('/students', {
        params: { seccion_id: selectedSection, academic_year_id: selectedYear }
      });
      setStudents(res.data);
      loadExistingAttendance(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendance = async (studentList) => {
    try {
      const res = await API.get('/attendance', {
        params: { section_id: selectedSection, academic_year_id: selectedYear, fecha }
      });
      const map = {};
      for (const a of res.data) {
        map[a.student_id] = a.estado;
      }
      setAttendanceMap(map);
      setSavedMap({ ...map });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateChange = (e) => {
    const newFecha = e.target.value;
    setFecha(newFecha);
    if (selectedSection && selectedYear && students.length > 0) {
      loadExistingAttendance(students);
    }
  };

  const handleEstadoChange = (studentId, estado) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: estado }));
  };

  const handleSave = async () => {
    if (!selectedYear || !fecha) return;
    const registros = students.map(s => ({
      student_id: s.id,
      estado: attendanceMap[s.id] || 'presente',
    }));
    try {
      await API.post('/attendance/batch', {
        academic_year_id: parseInt(selectedYear),
        fecha,
        registros,
      });
      setSavedMap({ ...attendanceMap });
      alert('Asistencia guardada correctamente');
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar');
    }
  };

  const loadSummary = async (studentId) => {
    if (!studentId || !selectedYear) return;
    try {
      const res = await API.get(`/attendance/summary/${studentId}/${selectedYear}`);
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getStudentName = (id) => {
    const s = students.find(s => s.id === id);
    return s ? `${s.nombre} ${s.apellido}` : '';
  };

  const handleDownloadPDF = async () => {
    if (!selectedSection || !selectedYear || !fecha) return;
    setGeneratingPdf(true);
    try {
      const res = await API.get('/attendance/pdf', {
        params: { section_id: selectedSection, academic_year_id: selectedYear, fecha },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `asistencia_${fecha}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al generar el PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const hasChanges = JSON.stringify(attendanceMap) !== JSON.stringify(savedMap);

  return (
    <div>
      <h1>Control de Asistencia</h1>

      <div className="filters">
        <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setStudents([]); setSummary(null); }}>
          <option value="">Seleccionar Año</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
        <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setStudents([]); setSummary(null); }}>
          <option value="">Seleccionar Sección</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <input type="date" value={fecha} onChange={handleDateChange} />
        <button className="btn btn-primary" onClick={loadStudents}>Cargar Alumnos</button>
      </div>

      {students.length > 0 && (
        <>
          <div className="table-container" style={{ marginBottom: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Alumno</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td>{s.nombre} {s.apellido}</td>
                    <td>
                      <select
                        value={attendanceMap[s.id] || 'presente'}
                        onChange={e => handleEstadoChange(s.id, e.target.value)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          fontWeight: 600,
                          background: attendanceMap[s.id] === 'presente' ? '#d1fae5'
                            : attendanceMap[s.id] === 'ausente' ? '#fee2e2'
                            : '#fef3c7',
                          color: attendanceMap[s.id] === 'presente' ? '#065f46'
                            : attendanceMap[s.id] === 'ausente' ? '#991b1b'
                            : '#92400e',
                        }}
                      >
                        <option value="presente">Presente</option>
                        <option value="ausente">Ausente</option>
                        <option value="justificado">Justificado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSave} disabled={!hasChanges}>
              {hasChanges ? 'Guardar Asistencia' : 'Guardado'}
            </button>

            <button className="btn" onClick={handleDownloadPDF} disabled={generatingPdf}>
              {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>

            <select
              value={selectedSummaryStudent}
              onChange={e => { setSelectedSummaryStudent(e.target.value); loadSummary(e.target.value); }}
              style={{ marginLeft: '1rem', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px' }}
            >
              <option value="">Ver resumen de alumno</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>
              ))}
            </select>
          </div>

          {summary && (
            <div className="card">
              <h3>Resumen de Asistencia - {getStudentName(selectedSummaryStudent)}</h3>
              <div className="stats-grid" style={{ marginTop: '0.5rem' }}>
                <div className="stat-card" style={{ background: '#d1fae5' }}>
                  <h3 style={{ color: '#065f46' }}>{summary.presentes}</h3>
                  <p>Presentes</p>
                </div>
                <div className="stat-card" style={{ background: '#fee2e2' }}>
                  <h3 style={{ color: '#991b1b' }}>{summary.ausentes}</h3>
                  <p>Ausentes</p>
                </div>
                <div className="stat-card" style={{ background: '#fef3c7' }}>
                  <h3 style={{ color: '#92400e' }}>{summary.justificados}</h3>
                  <p>Justificados</p>
                </div>
                <div className="stat-card">
                  <h3>{summary.total}</h3>
                  <p>Total Días</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && students.length === 0 && selectedSection && selectedYear && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
          Selecciona año, sección y fecha, luego presiona "Cargar Alumnos".
        </div>
      )}
    </div>
  );
}
