import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Sections from './pages/Sections';
import Students from './pages/Students';
import Grades from './pages/Grades';
import Attendance from './pages/Attendance';
import Merits from './pages/Merits';
import Subjects from './pages/Subjects';
import AcademicYears from './pages/AcademicYears';
import Reports from './pages/Reports';
import Graduados from './pages/Graduados';
import TransferStudent from './pages/TransferStudent';
import Teachers from './pages/Teachers';
import SectionSubjects from './pages/SectionSubjects';
import ModuleGrades from './pages/ModuleGrades';
import RecoveryGrades from './pages/RecoveryGrades';
import AttitudeReports from './pages/AttitudeReports';
import ChangePassword from './pages/ChangePassword';
import AlumniSinDerecho from './pages/AlumniSinDerecho';
import AlumnosReprobados from './pages/AlumnosReprobados';
import SystemClosure from './pages/SystemClosure';

function DefaultRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.rol === 'profesor' ? '/grades' : '/dashboard'} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DefaultRedirect />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<PrivateRoute roles={['director']}><Users /></PrivateRoute>} />
            <Route path="sections" element={<PrivateRoute roles={['director']}><Sections /></PrivateRoute>} />
            <Route path="students" element={<PrivateRoute roles={['director', 'subdirector', 'secretaria']}><Students /></PrivateRoute>} />
            <Route path="grades" element={<Grades />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="merits" element={<Merits />} />
            <Route path="attitude-reports" element={<AttitudeReports />} />
            <Route path="subjects" element={<PrivateRoute roles={['director']}><Subjects /></PrivateRoute>} />
            <Route path="teachers" element={<PrivateRoute roles={['director']}><Teachers /></PrivateRoute>} />
            <Route path="academic-years" element={<PrivateRoute roles={['director']}><AcademicYears /></PrivateRoute>} />
            <Route path="reports" element={<PrivateRoute roles={['director', 'subdirector', 'profesor']}><Reports /></PrivateRoute>} />
            <Route path="graduados" element={<PrivateRoute roles={['director', 'subdirector']}><Graduados /></PrivateRoute>} />
            <Route path="alumnos-sin-derecho" element={<PrivateRoute roles={['director', 'subdirector']}><AlumniSinDerecho /></PrivateRoute>} />
            <Route path="alumnos-reprobados" element={<PrivateRoute roles={['director', 'subdirector', 'secretaria']}><AlumnosReprobados /></PrivateRoute>} />
            <Route path="transfer" element={<PrivateRoute roles={['director', 'subdirector', 'secretaria']}><TransferStudent /></PrivateRoute>} />
            <Route path="module-grades" element={<ModuleGrades />} />
            <Route path="recovery-grades" element={<RecoveryGrades />} />
            <Route path="section-subjects" element={<PrivateRoute roles={['director']}><SectionSubjects /></PrivateRoute>} />
            <Route path="system-closure" element={<PrivateRoute roles={['director']}><SystemClosure /></PrivateRoute>} />
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
