import { Toaster } from 'sonner';

export default function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'vigil-toast',
          title: 'vigil-toast-title',
          description: 'vigil-toast-desc',
          icon: 'vigil-toast-icon',
          success: 'vigil-toast-success',
          error: 'vigil-toast-error',
          warning: 'vigil-toast-warning',
          info: 'vigil-toast-info',
          actionButton: 'vigil-toast-action',
          cancelButton: 'vigil-toast-cancel',
          closeButton: 'vigil-toast-close',
        },
      }}
    />
  );
}
