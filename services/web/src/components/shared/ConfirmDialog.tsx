import * as AlertDialog from '@radix-ui/react-alert-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="vigil-overlay" />
        <AlertDialog.Content className="vigil-dialog">
          <AlertDialog.Title className="vigil-dialog-title">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="vigil-dialog-desc">
              {description}
            </AlertDialog.Description>
          )}
          <div className="vigil-dialog-actions">
            <AlertDialog.Cancel className="vigil-btn-cancel">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className="vigil-btn-danger"
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
