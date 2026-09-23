import SetupForm from '../../components/auth/Setup/SetupForm';
import Branding from '../../components/shared/Branding';
import Logo from '../../components/shared/Logo';

export default function SetupPage() {
  return (
    <div className="setup bg-vigil-bg h-screen">
      <div className="mx-auto grid grid-cols-12 h-full">
        <div className="branding-panel">
          <Logo />
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
          <div className="footer-text">vigil observability · secure access</div>
        </div>
        <div className="form-panel">
          <SetupForm />
        </div>
      </div>
    </div>
  );
}
