import './index.css';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import SetupPage from './pages/Setup/SetupPage';
import ProtectedRoute from './auth/ProtectedRoute';
import OverviewPage from './pages/Overview/OverviewPage';
import PublicOnlyRoute from './auth/PublicOnlyRoute';
import AuthEntryGuard from './auth/AuthEntryGuard';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import AlertsPage from './pages/Alerts/AlertsPage';
import LogsPage from './pages/Logs/LogsPage';
import MetricsPage from './pages/Metrics/MetricsPage';
import TracesPage from './pages/Traces/TracesPage';
import ServicesPage from './pages/Services/ServicesPage';
import AlertsRulesPage from './pages/AlertRules/AlertsRulesPage';
import SettingsPage from './pages/Settings/SettingsPage';
import StatusPage from './pages/Status/StatusPage';
import AiInsightsPage from './pages/AIInsights/AIInsightsPage';

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
          <Route element={<DashboardLayout />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/ai-insights" element={<AiInsightsPage />} />
            <Route path="/traces" element={<TracesPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/alert-rules" element={<AlertsRulesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
