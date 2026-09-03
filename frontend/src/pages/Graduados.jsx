import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function Graduados() {
  const [graduados, setGraduados] = useState([]);

  useEffect(() => {
    API.get('/reports/graduados').then(r => setGraduados(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h1>Alumnos Egresados</h1>
      <p>Total: {graduados.length} egresados</p>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Género</th>
              <th>Sección</th>
              <th>Fecha de Egreso</th>
            </tr>
          </thead>
          <tbody>
            {graduados.map(g => (
              <tr key={g.id}>
                <td>{g.nombre}</td>
                <td>{g.apellido}</td>
                <td>{g.genero || '-'}</td>
                <td>{g.seccion_nombre || '-'}</td>
                <td>{new Date(g.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
