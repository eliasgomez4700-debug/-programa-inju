import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function RecoveryGrades() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [recoveryGrades, setRecoveryGrades] = useState([]);
  const [recoveryForm, setRecoveryForm] = useState({ ni: '', pps: '', sp: '', sps: '' });
  const [editingRecovery, setEditingRecovery] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/academic-years').then(r => setYears(r.data)).catch(() => {});
    API.get('/sections').then(r => setSections(r.data)).catch(() => {});
    API.get('/students').then(r => setStudents(r.data)).catch(() => {});
  }, []);

  const filteredStudents = students.filter(s => {
    if (selectedSection && s.seccion_id !== parseInt(selectedSection)) return false;
    return true;
  });

  const loadRecoveryGrades = async () => {
    if (!selectedStudent || !selectedYear) { setRecoveryGrades([]); return; }
    setLoading(true);
    try {
      const res = await API.get(`/recovery-grades/student/${selectedStudent}/year/${selectedYear}`);
      setRecoveryGrades(res.data);
    } catch {
      setRecoveryGrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent && selectedYear) loadRecoveryGrades();
  }, [selectedStudent, selectedYear]);

  const handleSubmitRecovery = async (e) => {
    e.preventDefault();
    try {
      await API.post('/recovery-grades', {
        student_id: editingRecovery.student_id,
        subject_id: editingRecovery.subject_id,
        academic_year_id: parseInt(selectedYear),
        ni: parseFloat(recoveryForm.ni) || 0,
        pps: parseFloat(recoveryForm.pps) || 0,
        sp: parseFloat(recoveryForm.sp) || 0,
        sps: parseFloat(recoveryForm.sps) || 0,
      });
      setEditingRecovery(null);
      setRecoveryForm({ ni: '', pps: '', sp: '', sps: '' });
      loadRecoveryGrades();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const startEditRecovery = (rg) => {
    setEditingRecovery(rg);
    setRecoveryForm({ ni: rg.ni || '', pps: rg.pps || '', sp: rg.sp || '', sps: rg.sps || '' });
  };

  const calculateNF = (pp, ni, pps, sp, sps) => {
    if (pp >= 6.0) return { nf: pp, estado: 'aprobado' };
    let nf = pp;
    if (ni > 0) { if (ni >= 6.0) return { nf: 6.0, estado: 'aprobado' }; nf = ni; }
    if (pps > 0) { if (pps >= 6.0) return { nf: 6.0, estado: 'aprobado' }; nf = pps; }
    if (sp > 0) { if (sp >= 6.0) return { nf: 6.0, estado: 'aprobado' }; nf = sp; }
    if (sps > 0) { if (sps >= 6.0) return { nf: 6.0, estado: 'aprobado' }; nf = sps; }
    return { nf: parseFloat(nf.toFixed(2)), estado: nf >= 6.0 ? 'aprobado' : 'reprobado' };
  };

  return (
    <div>
      <h1>Notas de Recuperación</h1>

      <div className="filters">
        <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setRecoveryGrades([]); setEditingRecovery(null); }}>
          <option value="">Seleccionar Año</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
        <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setSelectedStudent(''); setRecoveryGrades([]); setEditingRecovery(null); }}>
          <option value="">Todas las secciones</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={selectedStudent} onChange={e => { setSelectedStudent(e.target.value); setEditingRecovery(null); setRecoveryForm({ ni: '', pps: '', sp: '', sps: '' }); }}>
          <option value="">Seleccionar Alumno</option>
          {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
        </select>
        <button className="btn btn-secondary" onClick={() => window.print()} disabled={!recoveryGrades.length}>
          Imprimir
        </button>
      </div>

      {editingRecovery && (
        <form onSubmit={handleSubmitRecovery} className="card form-card">
          <h3>Ingresar Nota de Recuperación</h3>
          <div className="form-row">
            <div className="form-group" style={{ minWidth: '200px' }}>
              <label>Materia</label>
              <select
                value={editingRecovery.subject_id}
                onChange={e => {
                  const selected = recoveryGrades.find(rg => rg.subject_id === parseInt(e.target.value));
                  if (selected) {
                    setEditingRecovery(selected);
                    setRecoveryForm({ ni: selected.ni || '', pps: selected.pps || '', sp: selected.sp || '', sps: selected.sps || '' });
                  }
                }}
              >
                {recoveryGrades.map(rg => (
                  <option key={rg.subject_id} value={rg.subject_id}>{rg.subject_nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>NI (Promedio Periodos)</label>
              <input type="number" step="0.01" min="0" max="10" value={editingRecovery.pp} readOnly
                style={{ backgroundColor: '#f0f0f0' }} />
            </div>
            <div className="form-group">
              <label>PP(Nota Institucional)</label>
              <input type="number" step="0.01" min="0" max="10" value={recoveryForm.ni}
                onChange={e => setRecoveryForm({ ...recoveryForm, ni: e.target.value })}
                disabled={editingRecovery.pp >= 6.0} />
            </div>
            <div className="form-group">
              <label>PPS (1ra Suficiencia)</label>
              <input type="number" step="0.01" min="0" max="10" value={recoveryForm.pps}
                onChange={e => setRecoveryForm({ ...recoveryForm, pps: e.target.value })}
                disabled={editingRecovery.pp >= 6.0 || (!recoveryForm.ni && editingRecovery.ni === 0)} />
            </div>
            <div className="form-group">
              <label>SP (2da Prueba)</label>
              <input type="number" step="0.01" min="0" max="10" value={recoveryForm.sp}
                onChange={e => setRecoveryForm({ ...recoveryForm, sp: e.target.value })}
                disabled={editingRecovery.pp >= 6.0 || (!recoveryForm.pps && editingRecovery.pps === 0)} />
            </div>
            <div className="form-group">
              <label>SPS (2da Suficiencia)</label>
              <input type="number" step="0.01" min="0" max="10" value={recoveryForm.sps}
                onChange={e => setRecoveryForm({ ...recoveryForm, sps: e.target.value })}
                disabled={editingRecovery.pp >= 6.0 || (!recoveryForm.sp && editingRecovery.sp === 0)} />
            </div>
            <div className="form-group">
              <label>NF (Nota Final)</label>
              <input value={calculateNF(
                editingRecovery.pp,
                parseFloat(recoveryForm.ni) || 0,
                parseFloat(recoveryForm.pps) || 0,
                parseFloat(recoveryForm.sp) || 0,
                parseFloat(recoveryForm.sps) || 0
              ).nf} readOnly style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }} />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <input value={calculateNF(
                editingRecovery.pp,
                parseFloat(recoveryForm.ni) || 0,
                parseFloat(recoveryForm.pps) || 0,
                parseFloat(recoveryForm.sp) || 0,
                parseFloat(recoveryForm.sps) || 0
              ).estado === 'aprobado' ? 'APROBADO' : 'REPROBADO'} readOnly
                style={{
                  backgroundColor: calculateNF(
                    editingRecovery.pp,
                    parseFloat(recoveryForm.ni) || 0,
                    parseFloat(recoveryForm.pps) || 0,
                    parseFloat(recoveryForm.sp) || 0,
                    parseFloat(recoveryForm.sps) || 0
                  ).estado === 'aprobado' ? '#d4edda' : '#f8d7da',
                  fontWeight: 'bold'
                }} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Guardar</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setEditingRecovery(null); setRecoveryForm({ ni: '', pps: '', sp: '', sps: '' }); }}>Cancelar</button>
          </div>
        </form>
      )}

      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        PP = Promedio de Periodos | NI = Nota Institucional | PPS = 1ra Prueba Suficiencia | SP = 2da Prueba | SPS = 2da Suficiencia
      </p>

      {loading ? (
        <div className="loading">Cargando notas de recuperación...</div>
      ) : !selectedStudent || !selectedYear ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
          Selecciona un año académico y un alumno para ver las notas de recuperación.
        </div>
      ) : recoveryGrades.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
          No se encontraron materias para este alumno.
        </div>
      ) : (
        <div className="table-container print-area">
          <table>
            <thead>
              <tr>
                <th>Materia</th>
                <th>PP</th>
                <th>NI</th>
                <th>PPS</th>
                <th>SP</th>
                <th>SPS</th>
                <th>NF</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {recoveryGrades.map(rg => {
                const nfCalc = calculateNF(rg.pp, rg.ni, rg.pps, rg.sp, rg.sps);
                return (
                  <tr key={rg.subject_id} style={{ backgroundColor: rg.needs_recovery ? '#fff3cd' : 'transparent' }}>
                    <td>{rg.subject_nombre}</td>
                    <td><strong>{rg.pp}</strong></td>
                    <td>{rg.ni || '-'}</td>
                    <td>{rg.pps || '-'}</td>
                    <td>{rg.sp || '-'}</td>
                    <td>{rg.sps || '-'}</td>
                    <td><strong>{nfCalc.nf}</strong></td>
                    <td>
                      <span className={`badge ${nfCalc.estado === 'aprobado' ? 'badge-aprobado' : 'badge-reprobado'}`}>
                        {nfCalc.estado === 'aprobado' ? 'Aprobado' : 'Reprobado'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-primary" onClick={() => startEditRecovery(rg)}>
                        {rg.ni > 0 || rg.pps > 0 ? 'Editar' : 'Ingresar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
