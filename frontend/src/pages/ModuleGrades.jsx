import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

const NIVEL_LOGRO_LABELS = {
  5: 'Excelente',
  4: 'Aprobado',
  3: 'Básico',
  2: 'Inicial',
  1: 'Muy bajo',
};

export default function ModuleGrades() {
  const { user } = useAuth();
  const isTeacher = user?.rol === 'profesor';

  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [moduleSubjects, setModuleSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [grades, setGrades] = useState([]);
  const [gradeForm, setGradeForm] = useState({
    preparacion_nota1: '', preparacion_nota2: '', preparacion_nota3: '',
    ejecucion_nota1: '', ejecucion_nota2: '', ejecucion_nota3: '',
    evaluacion_nota1: '', evaluacion_nota2: '', evaluacion_nota3: '',
  });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = {};
    if (isTeacher) {
      params.teacher_id = user.id;
    }
    API.get('/academic-years').then(r => setYears(r.data)).catch(() => {});
    API.get('/subjects', { params: { tipo: 'modulo', ...params } }).then(r => setModuleSubjects(r.data)).catch(() => {});
    API.get('/sections', { params }).then(r => {
      setSections(r.data);
      if (r.data.length === 1) {
        setSelectedSection(r.data[0].id.toString());
      }
    }).catch(() => {});
    API.get('/students', { params }).then(r => setStudents(r.data)).catch(() => {});
  }, []);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedYear) params.academic_year_id = selectedYear;
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedStudent) params.student_id = selectedStudent;
      if (selectedSection) params.seccion_id = selectedSection;
      if (isTeacher) params.teacher_id = user.id;
      const res = await API.get('/module-grades', { params });
      setGrades(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    try {
      await API.post('/module-grades', {
        student_id: editing.student_id,
        subject_id: editing.subject_id,
        academic_year_id: parseInt(selectedYear),
        preparacion_nota1: parseFloat(gradeForm.preparacion_nota1) || 0,
        preparacion_nota2: parseFloat(gradeForm.preparacion_nota2) || 0,
        preparacion_nota3: parseFloat(gradeForm.preparacion_nota3) || 0,
        ejecucion_nota1: parseFloat(gradeForm.ejecucion_nota1) || 0,
        ejecucion_nota2: parseFloat(gradeForm.ejecucion_nota2) || 0,
        ejecucion_nota3: parseFloat(gradeForm.ejecucion_nota3) || 0,
        evaluacion_nota1: parseFloat(gradeForm.evaluacion_nota1) || 0,
        evaluacion_nota2: parseFloat(gradeForm.evaluacion_nota2) || 0,
        evaluacion_nota3: parseFloat(gradeForm.evaluacion_nota3) || 0,
      });
      setEditing(null);
      setGradeForm({
        preparacion_nota1: '', preparacion_nota2: '', preparacion_nota3: '',
        ejecucion_nota1: '', ejecucion_nota2: '', ejecucion_nota3: '',
        evaluacion_nota1: '', evaluacion_nota2: '', evaluacion_nota3: '',
      });
      loadGrades();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const startEdit = (g) => {
    setEditing(g);
    setGradeForm({
      preparacion_nota1: g.preparacion_nota1, preparacion_nota2: g.preparacion_nota2, preparacion_nota3: g.preparacion_nota3,
      ejecucion_nota1: g.ejecucion_nota1, ejecucion_nota2: g.ejecucion_nota2, ejecucion_nota3: g.ejecucion_nota3,
      evaluacion_nota1: g.evaluacion_nota1, evaluacion_nota2: g.evaluacion_nota2, evaluacion_nota3: g.evaluacion_nota3,
    });
  };

  const startNew = (student) => {
    if (!selectedSubject) {
      alert('Selecciona una materia de módulo primero');
      return;
    }
    setEditing({
      student_id: student.id,
      subject_id: parseInt(selectedSubject),
      student_nombre: student.nombre,
      student_apellido: student.apellido,
      subject_nombre: moduleSubjects.find(s => s.id === parseInt(selectedSubject))?.nombre || '',
      preparacion_nota1: 0, preparacion_nota2: 0, preparacion_nota3: 0,
      ejecucion_nota1: 0, ejecucion_nota2: 0, ejecucion_nota3: 0,
      evaluacion_nota1: 0, evaluacion_nota2: 0, evaluacion_nota3: 0,
      promedio: 0, nivel_logro: 1,
    });
    setGradeForm({
      preparacion_nota1: '', preparacion_nota2: '', preparacion_nota3: '',
      ejecucion_nota1: '', ejecucion_nota2: '', ejecucion_nota3: '',
      evaluacion_nota1: '', evaluacion_nota2: '', evaluacion_nota3: '',
    });
  };

  const calculatePromedioPreview = () => {
    const pn = ((parseFloat(gradeForm.preparacion_nota1) || 0) + (parseFloat(gradeForm.preparacion_nota2) || 0) + (parseFloat(gradeForm.preparacion_nota3) || 0)) / 3;
    const en = ((parseFloat(gradeForm.ejecucion_nota1) || 0) + (parseFloat(gradeForm.ejecucion_nota2) || 0) + (parseFloat(gradeForm.ejecucion_nota3) || 0)) / 3;
    const ev = ((parseFloat(gradeForm.evaluacion_nota1) || 0) + (parseFloat(gradeForm.evaluacion_nota2) || 0) + (parseFloat(gradeForm.evaluacion_nota3) || 0)) / 3;
    return parseFloat((pn * 0.25 + en * 0.50 + ev * 0.25).toFixed(2));
  };

  const calculateNivelPreview = (promedio) => {
    if (promedio >= 9.0) return 5;
    if (promedio >= 7.0) return 4;
    if (promedio >= 5.0) return 3;
    if (promedio >= 3.0) return 2;
    return 1;
  };

  const studentsWithoutGrades = students.filter(st => {
    if (selectedSection && st.seccion_id !== parseInt(selectedSection)) return false;
    return !grades.find(g => g.student_id === st.id);
  });

  return (
    <div>
      <h1>Notas de Módulo</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: '1rem' }}>
        Registro de notas por fases: Preparación (25%), Ejecución (50%) y Evaluación (25%).
      </p>

      <div className="filters">
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          <option value="">Seleccionar Año</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={isTeacher && moduleSubjects.length === 0}>
          <option value="">{isTeacher ? 'Mis materias de módulo' : 'Seleccionar Materia de Módulo'}</option>
          {moduleSubjects.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
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
      </div>

      {editing && (
        <form onSubmit={handleSubmitGrade} className="card form-card">
          <h3>
            {editing.id ? 'Editar Nota de Módulo' : 'Nueva Nota de Módulo'} - {editing.student_nombre} {editing.student_apellido} - {editing.subject_nombre}
          </h3>

          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Preparación (25%)</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Nota 1</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.preparacion_nota1}
                  onChange={e => setGradeForm({ ...gradeForm, preparacion_nota1: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nota 2</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.preparacion_nota2}
                  onChange={e => setGradeForm({ ...gradeForm, preparacion_nota2: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nota 3</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.preparacion_nota3}
                  onChange={e => setGradeForm({ ...gradeForm, preparacion_nota3: e.target.value })} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Ejecución (50%)</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Nota 1</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.ejecucion_nota1}
                  onChange={e => setGradeForm({ ...gradeForm, ejecucion_nota1: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nota 2</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.ejecucion_nota2}
                  onChange={e => setGradeForm({ ...gradeForm, ejecucion_nota2: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nota 3</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.ejecucion_nota3}
                  onChange={e => setGradeForm({ ...gradeForm, ejecucion_nota3: e.target.value })} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Evaluación (25%)</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Nota 1</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.evaluacion_nota1}
                  onChange={e => setGradeForm({ ...gradeForm, evaluacion_nota1: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nota 2</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.evaluacion_nota2}
                  onChange={e => setGradeForm({ ...gradeForm, evaluacion_nota2: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Nota 3</label>
                <input type="number" step="0.01" min="1" max="10" value={gradeForm.evaluacion_nota3}
                  onChange={e => setGradeForm({ ...gradeForm, evaluacion_nota3: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Promedio Final</label>
              <input value={calculatePromedioPreview()} readOnly style={{ fontWeight: 'bold', fontSize: '1.1rem' }} />
            </div>
            <div className="form-group">
              <label>Nivel de Logro</label>
              <input value={`${calculateNivelPreview(calculatePromedioPreview())} - ${NIVEL_LOGRO_LABELS[calculateNivelPreview(calculatePromedioPreview())]}`} readOnly style={{ fontWeight: 'bold', fontSize: '1.1rem' }} />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {selectedSubject && studentsWithoutGrades.length > 0 && (
        <div className="card">
          <h3>Alumnos sin notas en esta materia de módulo</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {studentsWithoutGrades.map(st => (
              <button key={st.id} className="btn btn-sm btn-secondary" onClick={() => startNew(st)}>
                {st.nombre} {st.apellido}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <div className="loading">Cargando notas de módulo...</div>
        ) : grades.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
            No hay notas de módulo registradas. Selecciona filtros y presiona "Buscar".
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Materia</th>
                <th>Preparación</th>
                <th>Ejecución</th>
                <th>Evaluación</th>
                <th>Promedio</th>
                <th>Nivel</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id}>
                  <td>{g.student_nombre} {g.student_apellido}</td>
                  <td>{g.subject_nombre}</td>
                  <td>{((parseFloat(g.preparacion_nota1) + parseFloat(g.preparacion_nota2) + parseFloat(g.preparacion_nota3)) / 3).toFixed(1)}</td>
                  <td>{((parseFloat(g.ejecucion_nota1) + parseFloat(g.ejecucion_nota2) + parseFloat(g.ejecucion_nota3)) / 3).toFixed(1)}</td>
                  <td>{((parseFloat(g.evaluacion_nota1) + parseFloat(g.evaluacion_nota2) + parseFloat(g.evaluacion_nota3)) / 3).toFixed(1)}</td>
                  <td><strong>{g.promedio}</strong></td>
                  <td><span className={`badge badge-nivel-${g.nivel_logro}`}>{g.nivel_logro}</span></td>
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
