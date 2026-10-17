import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { addWebhook } from '../api/webhooksApi';
import { toast } from 'sonner';
import { useAuth } from '../auth/authContext';

interface Webhook {
  id: string;
  url: string;
}

type Data = {
  onClose?: () => void;
};

export default function useWebhooksSettings({ onClose }: Data) {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [formError, setFormError] = useState('');

  const addMutation = useMutation({
    mutationFn: () => addWebhook(apiFetch, url.trim()),

    onSuccess: (newWebhook) => {
      queryClient.setQueryData<Webhook[]>(['webhooks'], (webhooks = []) => [
        ...webhooks,
        newWebhook,
      ]);
      toast.success('Webhook added successfully');
      onClose?.();
    },

    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    },
  });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setUrlError('');
    setFormError('');
  };

  const validateUrl = (): boolean => {
    const normalizedUrl = url.trim();

    if (!normalizedUrl) {
      setUrlError('URL is required');
      return false;
    }

    if (!normalizedUrl.startsWith('https://')) {
      setUrlError('URL must start with https://');
      return false;
    }

    try {
      const validUrl = new URL(normalizedUrl);
      if (!validUrl.hostname) {
        setUrlError('Enter a valid URL');
        return false;
      }
    } catch {
      setUrlError('Enter valid URL');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleAddWebhookSubmit = () => {
    if (!validateUrl()) return;
    setFormError('');
    addMutation.mutate();
  };

  return {
    url,
    urlError,
    formError,
    isFormSubmitting: addMutation.isPending,
    handleUrlChange,
    handleAddWebhookSubmit,
  };
}
