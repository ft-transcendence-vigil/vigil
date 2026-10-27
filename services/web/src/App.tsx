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
import AlertsRulesPage from './pages/AlertRules/AlertsRulesPage';
import StatusPage from './pages/Status/StatusPage';
import AppToaster from './components/shared/AppToaster';
import PermissionRoute from './auth/PermissionRoute';
import Legal from './components/Auth/Legal';
import SettingsLayout from './components/Settings/SettingsLayout';
import AccountSettingsPage from './pages/Settings/AccountSettingsPage';
import SessionsSettingsPage from './pages/Settings/SessionsSettingsPage';
import UsersSettingsPage from './pages/Settings/UsersSettingsPage';
import ApiKeysSettingsPage from './pages/Settings/ApiKeysSettingsPage';
import WebhooksSettingsPage from './pages/Settings/WebhooksSettingsPage';
import OnboardingLayout from './components/Services/OnboardingLayout';
import ServicesOnboardingPage from './pages/Services/ServicesOnboardingPage';
import AddServicePage from './pages/Services/AddServicePage';

function App() {
  return (
    <>
      <AppToaster />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/legal" element={<Legal />} />
          <Route element={<AuthEntryGuard />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/setup" element={<SetupPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route element={<OnboardingLayout />}>
            <Route
              path="/service-onboarding"
              element={
                <PermissionRoute>
                  <ServicesOnboardingPage />
                </PermissionRoute>
              }
            />
          </Route>
          <Route element={<DashboardLayout />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/traces" element={<TracesPage />} />
            <Route
              path="/add-service"
              element={
                <PermissionRoute>
                  <AddServicePage />
                </PermissionRoute>
              }
            />
            <Route
              path="/alert-rules"
              element={
                <PermissionRoute>
                  <AlertsRulesPage />
                </PermissionRoute>
              }
            />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="account" replace />} />
              <Route path="account" element={<AccountSettingsPage />} />
              <Route path="sessions" element={<SessionsSettingsPage />} />
              <Route
                path="users"
                element={
                  <PermissionRoute>
                    <UsersSettingsPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="api-keys"
                element={
                  <PermissionRoute>
                    <ApiKeysSettingsPage />
                  </PermissionRoute>
                }
              />
              <Route
                path="webhooks"
                element={
                  <PermissionRoute>
                    <WebhooksSettingsPage />
                  </PermissionRoute>
                }
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
