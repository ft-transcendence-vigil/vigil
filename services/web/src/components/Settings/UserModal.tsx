import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FormInput from '../shared/FormInput';
import Dropdown from '../shared/Dropdown';
import PasswordInput from '../shared/PasswordInput';
import Button from '../shared/Button';
import useUsersSettings from '../../hooks/useUsersSettings';
import type { User } from '../../api/usersApi';

type UseUsersSettingsOptions =
  | {
      mode: 'create';
      user?: never;
      onCreated?: () => void;
      onUpdated?: () => void;
    }
  | {
      mode: 'edit';
      user: User;
      onCreated?: () => void;
      onUpdated?: () => void;
    };

type Data = UseUsersSettingsOptions & {
  onClose: () => void;
};

export default function UserModal(props: Data) {
  const form = useUsersSettings(props);
  const { mode, onClose } = props;
  const isEdit = mode === 'edit';

  return (
    <div className="bg-[#050810b3] backdrop-blur-sm z-98 fixed inset-0">
      <div className="flex flex-col bg-vigil-card border border-vigil-border w-[95%] md:w-130 h-fit center-absolute z-99">
        <div className="flex items-center justify-between border-b border-b-vigil-border px-6 py-3.5">
          <h1 className="text-[18px]">{isEdit ? 'Edit User' : 'Add User'}</h1>
          <button
            onClick={onClose}
            className="text-[11px] p-2.5 border border-vigil-border cursor-pointer text-vigil-muted hover:border-white/20 hover:text-white/70 transition[border-color, color] duration-200"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="px-6 py-5 flex-1">
          <FormInput
            title="Email"
            type="text"
            value={form.email}
            error={form.emailError}
            onChange={form.handleEmailChange}
            className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
          />
          <Dropdown
            title="Role"
            options={['admin', 'viewer']}
            onChange={form.handleDropdownChange}
            value={form.role}
          />
          <PasswordInput
            title={
              isEdit ? 'New Password (Leave blank to keep current)' : 'Password'
            }
            error={form.passwordError}
            onChange={form.handlePasswordChange}
            className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
          />
          <PasswordInput
            title="Confirm New Password"
            error={form.confirmPasswordError}
            onChange={form.handleConfirmPasswordChange}
            className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
          />
          {form.formError && (
            <p className="mt-3 text-sm text-red-400">{form.formError}</p>
          )}
        </div>
        <div className="border-t border-t-vigil-border px-6 py-3.5 text-right space-x-3">
          <Button
            onClick={onClose}
            value="cancel"
            className="py-2.5! text-[13px]! text-vigil-muted! hover:border-white/20! hover:text-white/70! transition[border-color, color]! duration-200! bg-transparent! border border-vigil-border hover:opacity-100!"
          />
          <Button
            value={isEdit ? 'save' : 'create'}
            className="py-2.5! text-[13px]!"
            onClick={
              isEdit ? form.handleEditUserSubmit : form.handleAddUserSubmit
            }
            disabled={form.isFormSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
