import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { askAIAboutAlert } from '../api/alertAskApi';
import { useAuth } from '../auth/authContext';
import axios from 'axios';

interface Data {
  alertId: string;
  question: string;
}

export function useAlertAsk() {
  const { apiFetch } = useAuth();
  const [answer, setAnswer] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ alertId, question }: Data) => {
      setAnswer('');
      let fullAnswer = '';

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await askAIAboutAlert({
          apiFetch,
          alertId,
          question,
          onToken: (token) => {
            fullAnswer += token;
            setAnswer((prev) => prev + token);
          },
        });
        return fullAnswer;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
  });

  const clearAnswer = () => {
    setAnswer('');
  };

  const abort = () => {
    abortControllerRef.current?.abort();
  };

  const error = axios.isCancel(mutation.error) ? null : mutation.error;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    answer,
    isPending: mutation.isPending,
    error,
    askAsync: mutation.mutateAsync,
    clearAnswer,
    abort,
  };
}
