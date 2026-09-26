// import FormInput from '../../shared/FormInput';
// import PasswordInput from '../../shared/PasswordInput';
// import FormButton from '../../shared/FormButton';
// import { Link, useNavigate } from 'react-router-dom';
// import useAuhForm from '../../../auth/useAuthForm';
// import { AuthContext } from '../../../auth/authContext';
// import { useContext } from 'react';

import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../../auth/authContext';
import useAuhForm from '../../../auth/useAuthForm';
import AuthFormShell from '../AuthFormShell';

export default function LoginForm() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const {
    email,
    password,
    emailError,
    passwordError,
    confirmPasswordError,
    formError: setupError,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    runSubmit,
    isSubmitting,
  } = useAuhForm({ requireConfirm: true });

  if (!auth) throw new Error('AuthContext must be used inside AuthProvider');

  const handleSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSubmit(async () => {
      await auth.signUp(email, password);
      navigate('/dashboard');
    });
  };

  return (
    <AuthFormShell
      title="Create your admin account"
      caption="This runs once. After setup, new accounts are created from inside Vigil by an admin."
      formError={setupError}
      emailError={emailError}
      passwordError={passwordError}
      confirmPasswordError={confirmPasswordError}
      showConfirmPassword={true}
      submitLabel="Create admin account"
      onSubmit={handleSetup}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      onConfirmPasswordChange={handleConfirmPasswordChange}
      isSubmitting={isSubmitting}
    />
  );
}

// export default function SetupForm() {
//   const auth = useContext(AuthContext);
//   const navigate = useNavigate();
//   const {
//     email,
//     password,
//     emailError,
//     passwordError,
//     confirmPasswordError,
//     formError: setupError,
//     setFormError: setSetupError,
//     handleEmailChange,
//     handlePasswordChange,
//     handlePasswordConfirm,
//     validate,
//   } = useAuhForm();

//   if (!auth) throw new Error('AuthContext must be used inside AuthProvider');

//   const handleSetup = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     if (emailError.length !== 0) return;
//     if (!validate()) return;
//     try {
//       await auth.signUp(email, password);
//       navigate('/dashboard');
//     } catch (error) {
//       if (error instanceof Error) setSetupError(error);
//     }
//   };

//   return (
//     <div className="setup-form w-full px-20 sm:px-40 lg:px-0 lg:w-3/5">
//       <h1 className="title text-[33px] text-center lg:text-start">
//         Create your admin account
//       </h1>
//       <p className="caption text-vigil-muted mt-2 mb-8 text-center lg:text-start">
//         This runs once. After setup, new accounts are created from inside Vigil
//         by an admin.
//       </p>
//       {setupError && (
//         <p className="text-sm text-red-300 border border-red-400 p-4 bg-vigil-bg-input mb-4">
//           {setupError.message}
//         </p>
//       )}
//       <form onSubmit={handleSetup}>
//         <FormInput
//           onChange={handleEmailChange}
//           title="Email"
//           type="text"
//           placeholder="you@company.com"
//           error={emailError}
//         />
//         <PasswordInput onChange={handlePasswordChange} error={passwordError} />
//         <PasswordInput
//           onChange={handlePasswordConfirm}
//           error={confirmPasswordError}
//           title="Confirm password"
//         />
//         <FormButton value="Create admin account" />
//         <div className="create-account-link text-vigil-muted text-center">
//           Already set up?{' '}
//           <Link
//             to="/auth/login"
//             className="text-vigil-blue hover:opacity-70 transition-opacity"
//           >
//             Log in
//           </Link>
//         </div>
//       </form>
//     </div>
//   );
// }
