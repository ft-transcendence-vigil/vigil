import { Link } from 'react-router-dom';
import SetupForm from '../../components/Auth/Setup/SetupForm';
import Branding from '../../components/shared/Branding';
import Logo from '../../components/shared/Logo';

export default function SetupPage() {
  return (
    <div className="setup bg-vigil-bg min-h-screen lg:h-screen">
      <div className="mx-auto grid grid-cols-12 h-full">
        <div className="branding-panel">
          <Logo className="mb-10 text-4xl px-5" />
          <Branding
            tagline="system initialization"
            title={{
              white: 'No admin account exists yet on this',
              blue: 'instance.',
            }}
            caption="Create the first account to take ownership of this deployment. It will have full admin access to alerts, logs, metrics, and traces."
            features={{
              one: 'api reachable',
              two: 'db connected',
              three: 'all system live',
            }}
          />
          <div className="flex items-center justify-between">
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
          <SetupForm />
        </div>
      </div>
    </div>
  );
}
