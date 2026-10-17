import CardLayout from '../../components/Settings/CardLayout';
import ChangePassword from '../../components/Settings/ChangePassword';
import Button from '../../components/shared/Button';
import { useAuth } from '../../auth/authContext';
import useAccountSettings from '../../hooks/useAccountSettings';

export default function AccountSettings() {
  const { user } = useAuth();
  const form = useAccountSettings();

  return (
    <div className="account-settings flex flex-col space-y-5">
      <CardLayout title="My Account">
        <h6 className="mb-2 text-vigil-muted-extra uppercase text-[13px]">
          Email
        </h6>
        <div className="flex items-center">
          <p className="me-4 text-[17px]">{user?.email}</p>
          <span className="uppercase text-[11px] tracking-wider px-2 py-1 text-vigil-blue bg-vigil-blue-100 border border-blue-400/20">
            {user?.role}
          </span>
        </div>
      </CardLayout>
      <CardLayout title="Change Email">
        <h6 className="mb-2 text-vigil-muted-extra uppercase text-[13px]">
          Email
        </h6>
        <div className="flex items-center space-x-3">
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={form.handleEmailChange}
            placeholder={user?.email}
            className={`outline-none px-4 py-3 w-100 border border-vigil-border focus:border-vigil-blue placeholder:text-vigil-muted ${
              form.emailError ? 'border! border-red-400! focus:outline-0!' : ''
            }`}
          />
          <Button
            value="save"
            onClick={form.handleEmailSubmit}
            disabled={form.isEmailSubmitting}
          />
        </div>
        {form.emailError && (
          <div className="text-xs text-red-400 mt-2">{form.emailError}</div>
        )}
      </CardLayout>
      <CardLayout title="Change Password">
        <div className="password-fields flex flex-col space-y-8">
          <ChangePassword
            title="new password"
            value={form.newPassword}
            onChange={form.handleNewPasswordChange}
            error={form.newPasswordError}
          />
          <ChangePassword
            title="confirm password"
            value={form.confirmPassword}
            onChange={form.handleConfirmPasswordChange}
            error={form.confirmPasswordError}
            showValidationBtn
            onClick={form.handlePasswordSubmit}
            disabled={form.isEmailSubmitting}
          />
          {form.passwordFieldError && (
            <div className="text-xs text-red-400">
              {form.passwordFieldError}
            </div>
          )}
        </div>
      </CardLayout>
    </div>
  );
}
