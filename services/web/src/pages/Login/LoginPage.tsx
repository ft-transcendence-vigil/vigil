import Logo from '../../components/shared/Logo';
import LoginForm from '../../components/auth/Login/LoginForm';
import Branding from '../../components/shared/Branding';

export default function LoginPage() {
  return (
    <div className="login bg-vigil-bg h-screen">
      <div className="mx-auto grid grid-cols-12 h-full">
        <div className="branding-panel">
          <Logo />
          <Branding
            tagline="observability platform"
            title={{ white: 'Every signal,', blue: 'one command center.' }}
            caption="              Alerts, logs, metrics, and traces, correlated and explained, so
              you find root cause before your users do."
            features={{
              one: 'api reachable',
              two: 'db connected',
              three: 'all system live',
            }}
          />
          <div className="footer-text">vigil observability · secure access</div>
        </div>
        <div className="form-panel">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
