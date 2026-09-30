import './App.css';
import './index.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import SetupPage from './pages/Setup/SetupPage';
import ProtectedRoute from './auth/ProtectedRoute';
import OverviewPage from './pages/Overview/OverviewPage';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import AuthEntryGuard from './auth/AuthEntryGuard';

function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthEntryGuard />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/setup" element={<SetupPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
