import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function AlumniSinDerecho() {
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/reports/alumnos-sin-derecho')
      .then(r => setAlumnos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Alumnos sin Derecho a Graduación</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
        Alumnos con 15 o más deméritos que pierden el derecho a graduarse.
      </p>

      <div className="table-container">
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : alumnos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
            No hay alumnos sin derecho a graduación.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Género</th>
                <th>Sección</th>
                <th>Deméritos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map(a => (
                <tr key={a.id}>
                  <td>{a.nombre}</td>
                  <td>{a.apellido}</td>
                  <td>{a.genero || '-'}</td>
                  <td>{a.seccion_nombre || '-'}</td>
                  <td>
                    <span className="badge badge-demerito">{a.total_demeritos}</span>
                  </td>
                  <td>
                    <span className="badge badge-reprobado">Sin derecho</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
