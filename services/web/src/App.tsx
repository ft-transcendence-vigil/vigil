import { Outlet, Route, Routes } from 'react-router-dom';
import './App.css';
import './index.css';
import LoginPage from './pages/Login/LoginPage';
import SetupPage from './pages/Setup/SetupPage';
import ProtectedRoute from './auth/ProtectedRoute';
import OverviewPage from './pages/DashboardPage';
import PublicOnlyRoute from './auth/PublicOnlyRoute';

function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicOnlyRoute/>}>
        <Route path="/auth" element={<Outlet />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="setup" element={<SetupPage />} />
        </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<OverviewPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
