import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axios';

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [sections, setSections] = useState([]);
  const [years, setYears] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    API.get('/academic-years').then(r => setYears(r.data)).catch(() => {});
    API.get('/students').then(r => setStudents(r.data)).catch(() => {});
    API.get('/sections').then(r => setSections(r.data)).catch(() => {});
  }, []);

  const filteredStudents = students.filter(s => {
    if (selectedSection && s.seccion_id !== parseInt(selectedSection)) return false;
    if (selectedGrade && s.grado !== parseInt(selectedGrade)) return false;
    return true;
  });

  const loadPeriods = async (yearId) => {
    if (!yearId) { setPeriods([]); return; }
    const res = await API.get(`/academic-years/${yearId}/periods`);
    setPeriods(res.data);
  };

  const generateReport = async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try {
      const params = {};
      if (selectedPeriod) params.period_id = selectedPeriod;
      const res = await API.get(`/grades/report/${selectedStudent}`, { params });
      setReport(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalAverage = async () => {
    if (!selectedStudent || !selectedYear) return;
    try {
      const res = await API.post(`/grades/calculate/${selectedStudent}/${selectedYear}`);
      alert(`Promedio calculado: ${res.data.promedio_general} - Estado: ${res.data.estado_final}`);
      generateReport();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al calcular promedio');
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedStudent) return;
    setGeneratingPdf(true);
    try {
      const params = {};
      if (selectedPeriod) params.period_id = selectedPeriod;
      const res = await API.get(`/reports/pdf/${selectedStudent}`, {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      const student = students.find(s => s.id === parseInt(selectedStudent));
      link.href = url;
      link.setAttribute('download', `reporte_${student?.apellido || ''}_${student?.nombre || ''}.pdf`);
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

  return (
    <div>
      <h1>Reportes de Notas</h1>

      <div className="filters">
        <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedPeriod(''); setPeriods([]); setReport(null); loadPeriods(e.target.value); }}>
          <option value="">Seleccionar Año</option>
          {years.map(y => <option key={y.id} value={y.id}>{y.año}</option>)}
        </select>
        <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
          <option value="">Todos los periodos</option>
          {periods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setSelectedStudent(''); setReport(null); }}>
          <option value="">Todas las secciones</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedStudent(''); setReport(null); }}>
          <option value="">Todos los grados</option>
          {[1, 2, 3].map(g => <option key={g} value={g}>{g}°</option>)}
        </select>
        <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
          <option value="">Seleccionar Alumno</option>
          {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
        </select>
        <button className="btn btn-primary" onClick={generateReport}>Generar Reporte</button>
        <button className="btn btn-secondary" onClick={calculateFinalAverage}>Calcular Promedio Final</button>
      </div>

      {loading && <div className="loading">Cargando reporte...</div>}

      {report && !loading && (
        <div>
          <div className="form-actions" style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={generatingPdf}>
              {generatingPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
          </div>
          <div className="print-area">
            <div className="print-header">
              <h1>INJU - Instituto Nacional de Jucuapa </h1>
              <h2>Reporte de Notas</h2>
              <p><strong>Alumno:</strong> {students.find(s => s.id === parseInt(selectedStudent))?.nombre} {students.find(s => s.id === parseInt(selectedStudent))?.apellido}</p>
              <p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>
            </div>

            <h3 style={{ marginTop: '1rem' }}>Materias Básicas</h3>
            <table>
              <thead>
                <tr>
                  <th rowSpan="2">Materia</th>
                  {periods.map(p => (
                    <th key={p.id} colSpan="6">{p.nombre}</th>
                  ))}
                </tr>
                <tr>
                  {periods.map(p => (
                    ['N1', 'N2', 'N3', 'Rec', 'Ref', 'Prom'].map((label, i) => (
                      <th key={`${p.id}-${i}`}>{label}</th>
                    ))
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.materias_basicas && report.materias_basicas.length > 0 ? report.materias_basicas.map((m, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'left' }}>{m.materia}</td>
                    {m.periodos.map(per => (
                      <React.Fragment key={per.periodo}>
                        <td>{per.notas.nota1}</td>
                        <td>{per.notas.nota2}</td>
                        <td>{per.notas.nota3}</td>
                        <td>{per.notas.recuperacion || 0}</td>
                        <td>{per.notas.refuerzo || 0}</td>
                        <td><strong>{per.notas.promedio}</strong></td>
                      </React.Fragment>
                    ))}
                  </tr>
                )) : (
                  <tr><td colSpan={periods.length * 6 + 1} style={{ textAlign: 'center' }}>Sin materias básicas</td></tr>
                )}
              </tbody>
            </table>

            {report.recuperacion && (
              <>
                <h3 style={{ marginTop: '1.5rem' }}>Notas de Recuperación</h3>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>
                  PP = Promedio de Periodos | NI = Nota Institucional | PPS = 1ra Prueba Suficiencia | SP = 2da Prueba | SPS = 2da Suficiencia | NF = Nota Final
                </p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {report.recuperacion.map((rg, i) => (
                      <tr key={i} style={{ backgroundColor: rg.pp < 6.0 ? '#fff3cd' : 'transparent' }}>
                        <td style={{ textAlign: 'left' }}>{rg.subject_nombre}</td>
                        <td><strong>{rg.pp}</strong></td>
                        <td>{rg.ni > 0 ? rg.ni : '-'}</td>
                        <td>{rg.pps > 0 ? rg.pps : '-'}</td>
                        <td>{rg.sp > 0 ? rg.sp : '-'}</td>
                        <td>{rg.sps > 0 ? rg.sps : '-'}</td>
                        <td><strong>{rg.nf}</strong></td>
                        <td>
                          <span className={`badge ${rg.estado === 'aprobado' ? 'aprobado' : rg.estado === 'sin recuperación' ? 'reprobado' : 'reprobado'}`}>
                            {rg.estado === 'aprobado' ? 'Aprobado' : rg.estado === 'sin recuperación' ? 'Sin Recuperación' : 'Reprobado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h3 style={{ marginTop: '1.5rem' }}>Materias de Módulo</h3>
            <table>
              <thead>
                <tr>
                  <th rowSpan="2">Materia</th>
                  <th colSpan="3">Preparación (25%)</th>
                  <th colSpan="3">Ejecución (50%)</th>
                  <th colSpan="3">Evaluación (25%)</th>
                  <th rowSpan="2">Promedio</th>
                  <th rowSpan="2">Nivel</th>
                </tr>
                <tr>
                  <th>N1</th><th>N2</th><th>N3</th>
                  <th>N1</th><th>N2</th><th>N3</th>
                  <th>N1</th><th>N2</th><th>N3</th>
                </tr>
              </thead>
              <tbody>
                {report.materias_modulo && report.materias_modulo.length > 0 ? report.materias_modulo.map((m, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'left' }}>{m.materia}</td>
                    <td>{m.notas.preparacion_nota1}</td>
                    <td>{m.notas.preparacion_nota2}</td>
                    <td>{m.notas.preparacion_nota3}</td>
                    <td>{m.notas.ejecucion_nota1}</td>
                    <td>{m.notas.ejecucion_nota2}</td>
                    <td>{m.notas.ejecucion_nota3}</td>
                    <td>{m.notas.evaluacion_nota1}</td>
                    <td>{m.notas.evaluacion_nota2}</td>
                    <td>{m.notas.evaluacion_nota3}</td>
                    <td><strong>{m.notas.promedio}</strong></td>
                    <td><span className={`badge badge-nivel-${m.notas.nivel_logro}`}>{m.notas.nivel_logro}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="12" style={{ textAlign: 'center' }}>Sin materias de módulo</td></tr>
                )}
              </tbody>
            </table>

            <p><strong>Promedio Final:</strong> {report.promedio_final}</p>
            <p><strong>Estado:</strong>
              <span className={`badge ${report.estado_final === 'aprobado' ? 'aprobado' : 'reprobado'}`}>
                {report.estado_final === 'aprobado' ? 'Aprobado' : report.estado_final === 'reprobado' ? 'Reprobado' : report.estado_final}
              </span>
            </p>

            {report.actitud && report.actitud.length > 0 && (
              <>
                <h3 style={{ marginTop: '1.5rem' }}>Reporte de Actitud</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Periodo</th>
                      <th>Convivencia y Cultura de Paz</th>
                      <th>Decisión Autónoma</th>
                      <th>Expresión y Respeto</th>
                      <th>Pertenencia y Cultura</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.actitud.map((a, i) => (
                      <tr key={i}>
                        <td>{a.period_nombre}</td>
                        <td>{a.convivencia_cultura_paz === 'excelente' ? 'Excelente' : a.convivencia_cultura_paz === 'muy_bueno' ? 'Muy Bueno' : 'Bueno'}</td>
                        <td>{a.decision_autonoma === 'excelente' ? 'Excelente' : a.decision_autonoma === 'muy_bueno' ? 'Muy Bueno' : 'Bueno'}</td>
                        <td>{a.expresion_respeto === 'excelente' ? 'Excelente' : a.expresion_respeto === 'muy_bueno' ? 'Muy Bueno' : 'Bueno'}</td>
                        <td>{a.pertenencia_cultura === 'excelente' ? 'Excelente' : a.pertenencia_cultura === 'muy_bueno' ? 'Muy Bueno' : 'Bueno'}</td>
                        <td>{a.observaciones || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
