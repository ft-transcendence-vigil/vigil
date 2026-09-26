import FormButton from '../shared/FormButton';
import FormInput from '../shared/FormInput';
import PasswordInput from '../shared/PasswordInput';

interface Data {
  title: string;
  caption: string;
  formError: Error | null;
  emailError: string;
  passwordError: string;
  confirmPasswordError?: string;
  showConfirmPassword?: boolean;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AuthFormShell(props: Data) {
  return (
    <div className="setup-form w-full px-20 sm:px-40 lg:px-0 lg:w-3/5">
      <h1 className="title text-[33px] text-center lg:text-start">
        {props.title}
      </h1>
      <p className="caption text-vigil-muted mt-2 mb-8 text-center lg:text-start">
        {props.caption}
      </p>
      {props.formError && (
        <p className="text-sm text-red-300 border border-red-400 p-4 bg-vigil-bg-input mb-4">
          {props.formError.message}
        </p>
      )}
      <form onSubmit={props.onSubmit}>
        <FormInput
          onChange={props.onEmailChange}
          title="Email"
          type="text"
          placeholder="you@company.com"
          error={props.emailError}
        />
        <PasswordInput
          onChange={props.onPasswordChange}
          error={props.passwordError}
        />
        {props.showConfirmPassword && (
          <PasswordInput
            onChange={props.onConfirmPasswordChange}
            error={props.confirmPasswordError}
            title="Confirm password"
          />
        )}
        <FormButton value={props.submitLabel} disabled={props.isSubmitting} />
      </form>
    </div>
  );
}
