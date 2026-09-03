import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Grades() {
  const { user } = useAuth();
  const isTeacher = user?.rol === 'profesor';

  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [grades, setGrades] = useState([]);
  const [gradeForm, setGradeForm] = useState({ nota1: '', nota2: '', nota3: '', recuperacion: '', refuerzo: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = {};
    if (isTeacher) {
      params.teacher_id = user.id;
    }
    API.get('/academic-years').then(r => setYears(r.data)).catch(() => {});
    API.get('/subjects', { params: { tipo: 'basica', ...params } }).then(r => setSubjects(r.data)).catch(() => {});
    API.get('/sections', { params }).then(r => {
      setSections(r.data);
      if (r.data.length === 1) {
        setSelectedSection(r.data[0].id.toString());
      }
    }).catch(() => {});
    API.get('/students', { params }).then(r => setStudents(r.data)).catch(() => {});
  }, []);

  const loadPeriods = async (yearId) => {
    if (!yearId) { setPeriods([]); return; }
    const res = await API.get(`/academic-years/${yearId}/periods`);
    setPeriods(res.data);
  };

  const loadGrades = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedPeriod) params.period_id = selectedPeriod;
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedStudent) params.student_id = selectedStudent;
      if (selectedSection) params.seccion_id = selectedSection;
      if (isTeacher) params.teacher_id = user.id;
      const res = await API.get('/grades', { params });
      setGrades(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    try {
      await API.post('/grades', {
        student_id: editing.student_id,
        subject_id: editing.subject_id,
        period_id: editing.period_id,
        nota1: parseFloat(gradeForm.nota1) || 0,
        nota2: parseFloat(gradeForm.nota2) || 0,
        nota3: parseFloat(gradeForm.nota3) || 0,
        recuperacion: parseFloat(gradeForm.recuperacion) || 0,
        refuerzo: parseFloat(gradeForm.refuerzo) || 0,
      });
      setEditing(null);
      setGradeForm({ nota1: '', nota2: '', nota3: '', recuperacion: '', refuerzo: '' });
      loadGrades();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const startEdit = (g) => {
    setEditing(g);
    setGradeForm({ nota1: g.nota1, nota2: g.nota2, nota3: g.nota3, recuperacion: g.recuperacion, refuerzo: g.refuerzo });
  };

  const startNew = (student) => {
    if (!selectedPeriod || !selectedSubject) {
      alert('Selecciona un periodo y una materia primero');
      return;
    }
    setEditing({
      student_id: student.id,
      subject_id: parseInt(selectedSubject),
      period_id: parseInt(selectedPeriod),
      student_nombre: student.nombre,
      student_apellido: student.apellido,
      subject_nombre: subjects.find(s => s.id === parseInt(selectedSubject))?.nombre || '',
      period_nombre: periods.find(p => p.id === parseInt(selectedPeriod))?.nombre || '',
      nota1: 0, nota2: 0, nota3: 0, recuperacion: 0, refuerzo: 0, promedio: 0
    });
    setGradeForm({ nota1: '', nota2: '', nota3: '', recuperacion: '', refuerzo: '' });
  };

  const calculatePromedio = (n1, n2, n3, rec, ref) => {
    const regular = (parseFloat(n1) || 0) * 0.35 + (parseFloat(n2) || 0) * 0.35 + (parseFloat(n3) || 0) * 0.30;
    if (regular >= 6) return parseFloat(regular.toFixed(2));
    if ((parseFloat(rec) || 0) === 0 && (parseFloat(ref) || 0) === 0) return parseFloat(regular.toFixed(2));
    const notaRec = ((parseFloat(rec) || 0) + (parseFloat(ref) || 0)) / 2;
    if (notaRec >= 6) return 6;
    return parseFloat(notaRec.toFixed(2));
  };

  const studentsWithoutGrades = students.filter(st => {
    if (selectedSection && st.seccion_id !== parseInt(selectedSection)) return false;
    return !grades.find(g => g.student_id === st.id);
  });

  return (
    <div>
      <h1>Notas</h1>

      <div className="filters">
        <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); loadPeriods(e.target.value); }}>
          <option value="">Seleccionar Año</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
        <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
          <option value="">Todos los periodos</option>
          {periods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={isTeacher && subjects.length === 0}>
          <option value="">{isTeacher ? 'Mis materias' : 'Todas las materias'}</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={sections.length <= 1}>
          <option value="">{isTeacher ? 'Mis secciones' : 'Todas las secciones'}</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
          <option value="">Todos los alumnos</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
        </select>
        <button className="btn btn-primary" onClick={loadGrades}>Buscar</button>
        <button className="btn btn-secondary" onClick={() => window.print()} disabled={!grades.length}>
          Imprimir
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSubmitGrade} className="card form-card">
          <h3>
            {editing.id ? 'Editar Nota' : 'Nueva Nota'} - {editing.student_nombre} {editing.student_apellido} - {editing.subject_nombre} ({editing.period_nombre})
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Nota 1</label>
              <input type="number" step="0.01" min="0" max="10" value={gradeForm.nota1}
                onChange={e => setGradeForm({ ...gradeForm, nota1: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Nota 2</label>
              <input type="number" step="0.01" min="0" max="10" value={gradeForm.nota2}
                onChange={e => setGradeForm({ ...gradeForm, nota2: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Nota 3</label>
              <input type="number" step="0.01" min="0" max="10" value={gradeForm.nota3}
                onChange={e => setGradeForm({ ...gradeForm, nota3: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Rec</label>
              <input type="number" step="0.01" min="0" max="10" value={gradeForm.recuperacion}
                onChange={e => setGradeForm({ ...gradeForm, recuperacion: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Ref</label>
              <input type="number" step="0.01" min="0" max="10" value={gradeForm.refuerzo}
                onChange={e => setGradeForm({ ...gradeForm, refuerzo: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Promedio</label>
              <input value={calculatePromedio(gradeForm.nota1, gradeForm.nota2, gradeForm.nota3, gradeForm.recuperacion, gradeForm.refuerzo)} readOnly />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {selectedPeriod && selectedSubject && studentsWithoutGrades.length > 0 && (
        <div className="card">
          <h3>Alumnos sin notas en este periodo/materia</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {studentsWithoutGrades.map(st => (
              <button key={st.id} className="btn btn-sm btn-secondary" onClick={() => startNew(st)}>
                {st.nombre} {st.apellido}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="table-container print-area">
        {loading ? (
          <div className="loading">Cargando notas...</div>
        ) : grades.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
            No hay notas registradas. Selecciona filtros y presiona "Buscar".
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Materia</th>
                <th>Periodo</th>
                <th>Nota 1</th>
                <th>Nota 2</th>
                <th>Nota 3</th>
                <th>Rec</th>
                <th>Ref</th>
                <th>Promedio</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id}>
                  <td>{g.student_nombre} {g.student_apellido}</td>
                  <td>{g.subject_nombre}</td>
                  <td>{g.period_nombre}</td>
                  <td>{g.nota1}</td>
                  <td>{g.nota2}</td>
                  <td>{g.nota3}</td>
                  <td>{g.recuperacion || 0}</td>
                  <td>{g.refuerzo || 0}</td>
                  <td><strong>{g.promedio}</strong></td>
                  <td>
                    <span className={`badge ${g.promedio >= 6.0 ? 'badge-aprobado' : 'badge-reprobado'}`}>
                      {g.promedio >= 6.0 ? 'Aprobado' : 'Reprobado'}
                    </span>
                  </td>
                  <td><button className="btn btn-sm btn-primary" onClick={() => startEdit(g)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
