import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (form.new_password !== form.confirm_password) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (form.new_password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const res = await API.put('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setMessage(res.data.message);
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar contraseña');
    }
  };

  return (
    <div>
      <h1>Cambiar Contraseña</h1>
      <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem' }}>
        Actualiza tu contraseña de acceso al sistema.
      </p>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="card form-card">
        <div className="form-group">
          <label>Contraseña Actual</label>
          <input type="password" value={form.current_password}
            onChange={e => setForm({ ...form, current_password: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Nueva Contraseña</label>
          <input type="password" value={form.new_password} minLength={6}
            onChange={e => setForm({ ...form, new_password: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Confirmar Nueva Contraseña</label>
          <input type="password" value={form.confirm_password} minLength={6}
            onChange={e => setForm({ ...form, confirm_password: e.target.value })} required />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Actualizar Contraseña</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
