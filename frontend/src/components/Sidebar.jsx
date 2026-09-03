import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const rol = user?.rol;
  const isDirector = rol === 'director';
  const isSubdirector = rol === 'subdirector';
  const isSecretaria = rol === 'secretaria';
  const isProfesor = rol === 'profesor';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>INJU</h2>
        <p className="user-rol">{user?.nombre} ({rol})</p>
      </div>
      <nav className="sidebar-nav">
        {!isProfesor && (
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
            Dashboard
          </NavLink>
        )}

        {(isDirector || isSubdirector || isSecretaria) && (
          <>
            <NavLink to="/students" className={({ isActive }) => isActive ? 'active' : ''}>
              Alumnos
            </NavLink>
            <NavLink to="/transfer" className={({ isActive }) => isActive ? 'active' : ''}>
              Cambiar Sección
            </NavLink>
          </>
        )}

        <NavLink to="/grades" className={({ isActive }) => isActive ? 'active' : ''}>
          Notas Básicas
        </NavLink>
        <NavLink to="/recovery-grades" className={({ isActive }) => isActive ? 'active' : ''}>
          Notas de Recuperación
        </NavLink>
        <NavLink to="/module-grades" className={({ isActive }) => isActive ? 'active' : ''}>
          Notas de Módulo
        </NavLink>

        <NavLink to="/attendance" className={({ isActive }) => isActive ? 'active' : ''}>
          Asistencia
        </NavLink>

        <NavLink to="/merits" className={({ isActive }) => isActive ? 'active' : ''}>
          Méritos/Deméritos
        </NavLink>

        <NavLink to="/attitude-reports" className={({ isActive }) => isActive ? 'active' : ''}>
          Reportes de Actitud
        </NavLink>

        {(isDirector || isSubdirector || isProfesor) && (
          <>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
              Reportes
            </NavLink>
          </>
        )}

        {(isDirector || isSubdirector) && (
          <>
            <NavLink to="/graduados" className={({ isActive }) => isActive ? 'active' : ''}>
              Egresados
            </NavLink>
            <NavLink to="/alumnos-sin-derecho" className={({ isActive }) => isActive ? 'active' : ''}>
              Sin Derecho a Graduación
            </NavLink>
          </>
        )}

        {(isDirector || isSubdirector || isSecretaria) && (
          <>
            <NavLink to="/alumnos-reprobados" className={({ isActive }) => isActive ? 'active' : ''}>
              Alumnos Reprobados
            </NavLink>
          </>
        )}

        {isDirector && (
          <>
            <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
              Usuarios
            </NavLink>
            <NavLink to="/sections" className={({ isActive }) => isActive ? 'active' : ''}>
              Secciones
            </NavLink>
            <NavLink to="/subjects" className={({ isActive }) => isActive ? 'active' : ''}>
              Materias
            </NavLink>
            <NavLink to="/academic-years" className={({ isActive }) => isActive ? 'active' : ''}>
              Años Académicos
            </NavLink>
            <NavLink to="/teachers" className={({ isActive }) => isActive ? 'active' : ''}>
              Profesores
            </NavLink>
            <NavLink to="/section-subjects" className={({ isActive }) => isActive ? 'active' : ''}>
              Materias por Sección
            </NavLink>
            <NavLink to="/system-closure" className={({ isActive }) => isActive ? 'active' : ''}>
              Cierre del Sistema
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/change-password" className="btn-logout" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', marginBottom: '0.5rem', background: 'var(--secondary)', padding: '0.625rem 1rem', borderRadius: '6px', color: 'white', fontSize: '0.875rem', fontWeight: '500' }}>
          Cambiar Contraseña
        </NavLink>
        <button onClick={logout} className="btn-logout">Cerrar Sesión</button>
      </div>
    </aside>
  );
}
