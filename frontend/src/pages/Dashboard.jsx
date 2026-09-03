import { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    API.get('/reports/dashboard').then(res => setData(res.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bienvenido, {user?.nombre}</p>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{data?.total_estudiantes || 0}</h3>
          <p>Estudiantes Activos</p>
        </div>
        <div className="stat-card">
          <h3>{data?.total_profesores || 0}</h3>
          <p>Profesores</p>
        </div>
        <div className="stat-card">
          <h3>{data?.total_secciones || 0}</h3>
          <p>Secciones</p>
        </div>
        <div className="stat-card">
          <h3>{data?.total_materias || 0}</h3>
          <p>Materias</p>
        </div>
        <div className="stat-card">
          <h3>{data?.total_egresados || 0}</h3>
          <p>Egresados</p>
        </div>
        <div className="stat-card warning">
          <h3>{data?.notas_pendientes || 0}</h3>
          <p>Notas Pendientes</p>
        </div>
      </div>
    </div>
  );
}
