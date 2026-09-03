import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function AcademicYears() {
  const [years, setYears] = useState([]);
  const [form, setForm] = useState({ año: new Date().getFullYear() });

  const load = async () => {
    try {
      const res = await API.get('/academic-years');
      setYears(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/academic-years', form);
      setForm({ año: new Date().getFullYear() });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div>
      <h1>Años Académicos</h1>
      <form onSubmit={handleSubmit} className="card form-card">
        <div className="form-row">
          <div className="form-group">
            <label>Año</label>
            <input type="number" value={form.año} onChange={e => setForm({ ...form, año: e.target.value })} required />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">Crear Año Académico</button>
      </form>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Año</th>
              <th>Estado</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {years.map(y => (
              <tr key={y.id}>
                <td>{y.año}</td>
                <td>{y.activo ? 'Activo' : 'Inactivo'}</td>
                <td>{new Date(y.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
