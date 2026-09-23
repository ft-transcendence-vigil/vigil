import FormInput from '../../shared/FormInput';
import PasswordInput from '../../shared/PasswordInput';
import FormButton from '../../shared/FormButton';
import { Link } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../../../auth/authContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const authContext = useContext(AuthContext);

  if (!authContext)
    throw new Error('AuthContext must be used inside AuthProvider');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await authContext.signIn(email, password);
    } catch (error) {
      console.log('login fail', error);
    }
  };

  return (
    <div className="login-form w-full px-20 sm:px-40 lg:px-0 lg:w-3/5">
      <h1 className="title text-[33px] text-center lg:text-start">Log in</h1>
      <p className="caption text-vigil-muted mt-2 mb-8 text-center lg:text-start">
        Enter your credentials to access the dashboard.
      </p>
      <form onSubmit={handleLogin}>
        <FormInput
          onChange={(e) => setEmail(e.target.value)}
          title="Email"
          type="email"
          placeholder="you@company.com"
        />
        <PasswordInput onChange={(e) => setPassword(e.target.value)} />
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
