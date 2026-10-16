import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FormInput from '../shared/FormInput';
import Button from '../shared/Button';
import useWebhooksSettings from '../../hooks/useWebhooksSettings';

interface Data {
  onClose: () => void;
}

export default function WebhookModal(props: Data) {
  const form = useWebhooksSettings(props);

  return (
    <div className="bg-[#050810b3] backdrop-blur-sm z-98 fixed inset-0">
      <div className="flex flex-col bg-vigil-card border border-vigil-border w-[95%] md:w-130 h-fit center-absolute z-99">
        <div className="flex items-center justify-between border-b border-b-vigil-border px-6 py-3.5">
          <h1 className="text-[18px]">Add Webhook</h1>
          <button
            onClick={props.onClose}
            className="text-[11px] p-2.5 outline-none border border-vigil-border cursor-pointer text-vigil-muted hover:border-white/20 hover:text-white/70 transition[border-color, color] duration-200"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="px-6 py-5 flex-1">
          <FormInput
            title="URL"
            type="text"
            error={form.urlError}
            onChange={form.handleUrlChange}
            placeholder="https://example.com/webhook"
            className="outline-none px-4 py-2.5 w-full border border-vigil-border focus:border-vigil-blue"
          />
          <div className="text-vigil-muted-extra text-[13px] -mt-4.5 tracking-wide">
            Must be a valid https:// URL.
          </div>
          {form.formError && (
            <p className="mt-3 text-sm text-red-400">{form.formError}</p>
          )}
        </div>
        <div className="border-t border-t-vigil-border px-6 py-3.5 text-right space-x-3">
          <Button
            onClick={props.onClose}
            value="cancel"
            className="py-2.5! text-[13px]! text-vigil-muted! hover:border-white/20! hover:text-white/70! transition[border-color, color]! duration-200! bg-transparent! border border-vigil-border hover:opacity-100!"
          />
          <Button
            value="Add"
            className="py-2.5! text-[13px]!"
            onClick={form.handleAddWebhookSubmit}
            disabled={form.isFormSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
