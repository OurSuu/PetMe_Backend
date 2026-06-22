import { AlertTriangle, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  
  const Icon = variant === 'danger' ? AlertCircle : AlertTriangle;
  const iconColorClass = variant === 'danger' ? 'text-accent-danger bg-accent-danger/10' : 'text-accent-warning bg-accent-warning/10';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant={variant === 'danger' ? 'danger' : 'default'} size="sm">
      <div className="flex items-start gap-4 mb-6">
        <div className={`p-3 rounded-full shrink-0 ${iconColorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-text-secondary mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary/50 mt-4">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button 
          variant={variant === 'danger' ? 'danger' : 'primary'} 
          onClick={onConfirm} 
          loading={loading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
