import FormInput from '../../shared/FormInput';
import PasswordInput from '../../shared/PasswordInput';
import FormButton from '../../shared/FormButton';
import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../../auth/authContext';
import useAuhForm from '../../../auth/useAuhForm';

export default function LoginForm() {
  const authContext = useContext(AuthContext);

  const {
    email,
    password,
    emailError,
    passwordError,
    formError: loginError,
    setFormError: setLoginError,
    handleEmailChange,
    handlePasswordChange,
    validate,
  } = useAuhForm();

  if (!authContext)
    throw new Error('AuthContext must be used inside AuthProvider');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await authContext.signIn(email, password);
    } catch (error) {
      console.log('login fail', error);
      if (error instanceof Error) setLoginError(error);
    }
  };

  return (
    <div className="login-form w-full px-20 sm:px-40 lg:px-0 lg:w-3/5">
      <h1 className="title text-[33px] text-center lg:text-start">Log in</h1>
      <p className="caption text-vigil-muted mt-2 mb-8 text-center lg:text-start">
        Enter your credentials to access the dashboard.
      </p>
      {loginError && (
        <p className="text-sm text-red-300 border border-red-400 p-4 bg-vigil-bg-input mb-4">
          {loginError.message}
        </p>
      )}
      <form onSubmit={handleLogin}>
        <FormInput
          onChange={handleEmailChange}
          title="Email"
          type="text"
          placeholder="you@company.com"
          error={emailError}
        />
        <PasswordInput onChange={handlePasswordChange} error={passwordError} />
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
