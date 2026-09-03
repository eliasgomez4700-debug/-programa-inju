import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.rol)) {
    return <div className="error-page">No tienes permisos para acceder a esta página</div>;
  }
  return children;
}
