import Logo from '../../components/shared/Logo';
import LoginForm from '../../components/Auth/Login/LoginForm';
import Branding from '../../components/shared/Branding';
import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <div className="login bg-vigil-bg min-h-screen lg:h-screen">
      <div className="mx-auto grid grid-cols-12 h-full">
        <div className="branding-panel">
          <Logo className="mb-10 text-4xl px-5" />
          <Branding
            tagline="observability platform"
            title={{ white: 'Every signal,', blue: 'one command center.' }}
            caption="Alerts, logs, metrics, and traces, correlated and explained, so
              you find root cause before your users do."
            features={{
              one: 'api reachable',
              two: 'db connected',
              three: 'all system live',
            }}
          />
          <div className="flex items-center justify-between wrap-anywhere">
            <div className="footer-text">
              vigil observability · secure access
            </div>
            <div className="footer-text">
              <Link
                to="/legal#terms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:text-vigil-blue"
              >
                Terms of Service
              </Link>
              <Link
                to="/legal#privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:text-vigil-blue ms-10"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
        <div className="form-panel">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
