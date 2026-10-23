import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import AlertRulesRow from '../../components/AlertRules/AlertRulesRow';
import Button from '../../components/shared/Button';
import AlertModal from '../../components/AlertRules/AlertModal';
import useAlertRules, { PAGE_SIZE } from '../../hooks/useAlertRules';
import { useAuth } from '../../auth/authContext';
import {
  deleteAlertRule,
  updateAlertRule,
  type AlertRules,
} from '../../api/alertRulesApi';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';

type ModalState =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      rule: AlertRules;
    };

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Something went wrong';

export default function AlertsRulesPage() {
  const [modal, setModal] = useState<ModalState | null>(null);
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const { alertRulesQuery, offset, setOffset } = useAlertRules({
    mode: 'create',
  });
  const rules = alertRulesQuery.data?.data ?? [];
  const hasMore = alertRulesQuery.data?.hasMore ?? false;
  const [alertRuleToDelete, setAlertRuleToDelete] = useState<string | null>(
    null,
  );

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateAlertRule(apiFetch, id, { enabled }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },

    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAlertRule(apiFetch, id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Alert rule deleted');
    },

    onError: (error) => {
      toast.error(errorMessage(error));
    },

    onSettled: () => setAlertRuleToDelete(null),
  });

  const handleDelete = (rule: AlertRules) => {
    if (rule.is_default) return;
    setAlertRuleToDelete(rule.id);
  };

  return (
    <>
      <Button
        value="+ create rule"
        onClick={() => setModal({ mode: 'create' })}
        className="text-[11px]! md:text-[12px]! lg:text-[13px]! py-2! md:py-2.5! px-5! md:px-7! block! ms-auto! mb-8!"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-250 border-collapse border border-vigil-border">
          <thead>
            <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px] bg-[#0D1425] tracking-wide">
              <th className="py-2 md:py-4 px-2 md:px-3">Service</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Signal Type</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Metric Name</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Aggregation</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Window</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Threshold</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Severity</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Enabled</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Default</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-vigil-card">
            {alertRulesQuery.isLoading && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-vigil-muted">
                  Loading…
                </td>
              </tr>
            )}
            {alertRulesQuery.isError && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-red-400">
                  {errorMessage(alertRulesQuery.error)}
                </td>
              </tr>
            )}
            {!alertRulesQuery.isLoading &&
              !alertRulesQuery.isError &&
              rules.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="py-6 text-center text-vigil-muted"
                  >
                    No alert rules.
                  </td>
                </tr>
              )}
            {rules.map((rule: AlertRules) => (
              <AlertRulesRow
                key={rule.id}
                {...rule}
                onEdit={() => setModal({ mode: 'edit', rule })}
                onDelete={() => handleDelete(rule)}
                onToggle={(enabled) =>
                  toggleMutation.mutate({ id: rule.id, enabled })
                }
              />
            ))}
            <tr>
              <td colSpan={10}>
                <div className="flex justify-between items-center p-3">
                  <span className="text-vigil-muted text-[15px]">
                    {`Showing ${rules.length} results`}
                  </span>
                  <div className="text-right space-x-2">
                    <button
                      onClick={() =>
                        offset > 0 &&
                        setOffset((prev) => Math.max(prev - PAGE_SIZE, 0))
                      }
                      disabled={offset === 0 || alertRulesQuery.isFetching}
                      type="button"
                      className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border w-19 h-9 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-200"
                    >
                      <span className="me-2">‹</span> Prev
                    </button>
                    <button></button>
                    <button
                      onClick={() =>
                        hasMore && setOffset((prev) => prev + PAGE_SIZE)
                      }
                      disabled={!hasMore || alertRulesQuery.isFetching}
                      type="button"
                      className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border w-19 h-9 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-200"
                    >
                      Next <span className="ms-2">›</span>
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {modal?.mode === 'create' && (
          <AlertModal
            key="create"
            mode="create"
            onClose={() => setModal(null)}
            onCreated={() => setModal(null)}
          />
        )}
        {modal?.mode === 'edit' && (
          <AlertModal
            key={modal.rule.id}
            mode="edit"
            rule={modal.rule}
            onClose={() => setModal(null)}
            onUpdated={() => setModal(null)}
          />
        )}
        {alertRuleToDelete && (
          <ConfirmDialog
            open={alertRuleToDelete != null}
            onOpenChange={(o) => !o && setAlertRuleToDelete(null)}
            title="Delete alert rule?"
            description="This rule will stop triggering alerts. This cannot be undone."
            confirmLabel="Delete"
            onConfirm={() => {
              if (alertRuleToDelete) deleteMutation.mutate(alertRuleToDelete);
            }}
          />
        )}
      </div>
    </>
  );
}
