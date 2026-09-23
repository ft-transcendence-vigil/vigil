import { Outlet, Route, Routes } from 'react-router-dom';
import './App.css';
import './index.css';
import LoginPage from './pages/Login/LoginPage';
import SetupPage from './pages/Setup/SetupPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/auth" element={<Outlet />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="setup" element={<SetupPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
