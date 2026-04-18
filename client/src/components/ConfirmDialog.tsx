import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '네, 진행할게요',
  cancelLabel = '아니요',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={description ? 'confirm-desc' : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 safe-pb"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md m-4 rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`flex items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0 ${
              isDanger ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
            }`}
            aria-hidden
          >
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1 pt-1">
            <h2 id="confirm-title" className="text-senior-heading">
              {title}
            </h2>
            {description && (
              <p id="confirm-desc" className="text-senior-body text-gray-600 mt-2">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary" autoFocus>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn-primary ${isDanger ? '!bg-red-600 hover:!bg-red-700' : ''}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
