import { useState } from 'react';
import API from '../api/axios';

export default function SystemClosure() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleClose = async () => {
    if (!confirm(
      '¿Ejecutar el Cierre del Sistema?\n\n' +
      'Esto promoverá a todos los alumnos activos:\n' +
      '• General: 1° → 2°, 2° → Egresado\n' +
      '• Técnicas: 1° → 2°, 2° → 3°, 3° → Egresado\n' +
      '• Salud y Bienestar Social 2° → Atención Primaria en Salud 3°\n\n' +
      'Se desactivará el año actual y se activará el siguiente. Esta acción no se puede deshacer.'
    )) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await API.post('/system/close');
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al ejecutar el cierre del sistema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Cierre del Sistema</h1>

      <div className="card">
        <p style={{ marginBottom: '1rem', color: 'var(--text-light)' }}>
          Al ejecutar el cierre del sistema, todos los alumnos activos son promovidos automáticamente:
        </p>
        <ul style={{ marginLeft: '1.25rem', marginBottom: '1rem', lineHeight: 1.8 }}>
          <li><strong>General</strong> (A, B, C, D): 1° pasa a 2°, y 2° pasa a Egresado.</li>
          <li><strong>Técnicas</strong> (BTV/BTP): 1° a 2°, 2° a 3°, y 3° pasa a Egresado.</li>
          <li><strong>Salud y Bienestar Social</strong>: 2° pasa a 3° Atención Primaria en Salud.</li>
        </ul>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-light)' }}>
          El año académico actual queda cerrado y se activa automáticamente el siguiente.
        </p>
        <button className="btn btn-danger" onClick={handleClose} disabled={loading}>
          {loading ? 'Ejecutando cierre...' : 'Ejecutar Cierre del Sistema'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Cierre completado</h3>
          <div className="stats-grid" style={{ marginTop: '0.5rem' }}>
            <div className="stat-card" style={{ background: '#d1fae5' }}>
              <h3 style={{ color: '#065f46' }}>{result.promovidos}</h3>
              <p>Promovidos</p>
            </div>
            <div className="stat-card" style={{ background: '#fef3c7' }}>
              <h3 style={{ color: '#92400e' }}>{result.egresados}</h3>
              <p>Egresados</p>
            </div>
            <div className="stat-card">
              <h3>{result.sin_seccion}</h3>
              <p>Sin sección asignada</p>
            </div>
          </div>
          <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>
            Año cerrado: <strong>{result.año_actual?.año}</strong> | Año activo: <strong>{result.año_siguiente?.año}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
