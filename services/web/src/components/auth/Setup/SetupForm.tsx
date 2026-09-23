import FormInput from '../../shared/FormInput';
import PasswordInput from '../../shared/PasswordInput';
import FormButton from '../../shared/FormButton';
import { Link } from 'react-router-dom';

export default function SetupForm() {
  return (
    <div className="setup-form w-full px-20 sm:px-40 lg:px-0 lg:w-3/5">
      <h1 className="title text-[33px] text-center lg:text-start">
        Create your admin account
      </h1>
      <p className="caption text-vigil-muted mt-2 mb-8 text-center lg:text-start">
        This runs once. After setup, new accounts are created from inside Vigil
        by an admin.
      </p>
      <form>
        <FormInput title="Email" type="email" placeholder="you@company.com" />
        <PasswordInput />
        <PasswordInput />
        <FormButton value="Create admin account" />
        <div className="create-account-link text-vigil-muted text-center">
          Already set up?{' '}
          <Link
            to="/auth/login"
            className="text-vigil-cyan hover:opacity-70 transition-opacity"
          >
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
}
