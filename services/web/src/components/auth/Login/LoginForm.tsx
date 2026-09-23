import FormInput from '../../shared/FormInput';
import PasswordInput from '../../shared/PasswordInput';
import FormButton from '../../shared/FormButton';
import { Link } from 'react-router-dom';

export default function LoginForm() {
  return (
    <div className="login-form w-full px-20 sm:px-40 lg:px-0 lg:w-3/5">
      <h1 className="title text-[33px] text-center lg:text-start">Log in</h1>
      <p className="caption text-vigil-muted mt-2 mb-8 text-center lg:text-start">
        Enter your credentials to access the dashboard.
      </p>
      <form>
        <FormInput title="Email" type="email" placeholder="you@company.com" />
        <PasswordInput />
        <FormButton value="Log in" />
        <div className="create-account-link text-vigil-muted text-center">
          First time setup?{' '}
          <Link
            to="/auth/setup"
            className="text-vigil-cyan hover:opacity-70 transition-opacity"
          >
            Create admin account
          </Link>
        </div>
      </form>
    </div>
  );
}
