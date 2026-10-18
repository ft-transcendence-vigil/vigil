import FormButton from '../shared/FormButton';
import FormInput from '../shared/FormInput';
import PasswordInput from '../shared/PasswordInput';
import TermsCheckbox from './Setup/TermsCheckbox';

interface Data {
  title: string;
  caption: string;
  formError: Error | null;
  emailError: string;
  passwordError: string;
  confirmPasswordError?: string;
  isSetup?: boolean;
  submitLabel: string;
  isSubmitting: boolean;
  termsAccepted?: boolean;
  termsError?: string;
  onTermsChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AuthFormShell(props: Data) {
  const blocked = !!props.isSetup && !props.termsAccepted;

  return (
    <div className="setup-form w-full px-20 sm:px-40 lg:px-0 lg:w-3/5 xl:w-3/6">
      <h1 className="title text-[33px] text-center lg:text-start">
        {props.title}
      </h1>
      <p className="caption text-vigil-muted mt-2 mb-8 text-center lg:text-start">
        {props.caption}
      </p>
      {props.formError && (
        <p className="text-sm text-red-300 border border-red-400 p-4 bg-vigil-bg-input mb-4 capitalize">
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
        {props.isSetup && (
          <>
            <PasswordInput
              onChange={props.onConfirmPasswordChange}
              error={props.confirmPasswordError}
              title="Confirm password"
            />
            {props.onTermsChange && (
              <TermsCheckbox
                checked={!!props.termsAccepted}
                onChange={props.onTermsChange}
                error={props.termsError}
              />
            )}
          </>
        )}
        <FormButton
          value={props.submitLabel}
          disabled={props.isSubmitting || blocked}
        />
      </form>
    </div>
  );
}
