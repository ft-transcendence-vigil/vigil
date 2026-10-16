import { useState } from 'react';
import CardLayout from '../../components/Settings/CardLayout';
import WebhookModal from '../../components/Settings/WebhookModal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteWebhook, getAllWebhooks } from '../../api/webhooksApi';
import { useAuth } from '../../auth/authContext';
import WebhookRow from '../../components/Settings/WebhookRow';
import { toast } from 'sonner';

export default function WebhooksSettings() {
  const [modal, setModal] = useState(false);
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();

  const webhooksQuery = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => getAllWebhooks(apiFetch),
    staleTime: 5 * 60_000,
  });

  const webhookMutation = useMutation({
    mutationFn: (id: string) => deleteWebhook(apiFetch, id),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['webhooks'],
      });
      toast.success('Webhook deleted successfully');
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete webhook',
      );
    },
  });

  const webhooks = webhooksQuery.data ?? [];

  return (
    <div className="api-keys-settings flex flex-col space-y-5">
      <CardLayout
        title="Webhooks"
        description="Alerts are delivered to these URLs when triggered."
        btnValue="+ add webhook"
        onClick={() => setModal(true)}
      >
        {webhooks.length === 0 ? (
          <div className="text-vigil-muted flex items-center justify-center py-7 text-[17px]">
            No webhooks configured yet. Add one to start receiving alert
            notifications.
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px]">
                <th className="py-2 md:py-4 px-2 md:px-3">Url</th>
                <th className="py-2 md:py-4 px-2 md:px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <WebhookRow
                  key={webhook.id}
                  url={webhook.url}
                  onDelete={() => webhookMutation.mutate(webhook.id)}
                />
              ))}
            </tbody>
          </table>
        )}
        <div className="payload-format border border-vigil-border p-4 mt-8">
          <h1 className="uppercase text-vigil-muted-extra text-[12px] mb-2">
            Payload Format
          </h1>
          <div className="text-vigil-muted-extra text-[15px]">
            On alert, we POST a JSON payload to your URL including alert
            details, severity, and AI analysis. Delivery is fire-and-forget.
          </div>
        </div>
      </CardLayout>
      {modal && <WebhookModal onClose={() => setModal(false)} />}
    </div>
  );
}
