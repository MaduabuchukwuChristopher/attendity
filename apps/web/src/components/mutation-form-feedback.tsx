import { useEffect, useRef } from 'react';
import { apiErrorMessage } from '../features/auth/auth-utils.js';
import { useDashboardToast } from '../contexts/dashboard-toast-context.js';
import { FormActionFeedback } from './form-action-feedback.js';

interface MutationFormFeedbackProps {
  readonly status: 'idle' | 'success' | 'error';
  readonly submissionId: number;
  readonly successTitle: string;
  readonly successMessage: string;
  readonly errorTitle?: string;
  readonly errorFallback: string;
  readonly error: unknown;
}

export function MutationFormFeedback({
  status,
  submissionId,
  successTitle,
  successMessage,
  errorTitle = 'Action not completed',
  errorFallback,
  error,
}: MutationFormFeedbackProps) {
  const { notify } = useDashboardToast();
  const announced = useRef<string | undefined>(undefined);
  const errorMessage = status === 'error' ? apiErrorMessage(error, errorFallback) : undefined;
  const message = status === 'success' ? successMessage : errorMessage;

  useEffect(() => {
    if (status === 'idle' || !message) return;
    const key = `${submissionId}:${status}`;
    if (announced.current === key) return;
    announced.current = key;
    notify({
      tone: status,
      title: status === 'success' ? successTitle : errorTitle,
      message,
    });
  }, [errorTitle, message, notify, status, submissionId, successTitle]);

  return <FormActionFeedback message={message} status={status} />;
}
