import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const config: Record<AlertVariant, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'bg-blue-50 text-blue-800 border-blue-200' },
  success: { icon: CheckCircle, classes: 'bg-green-50 text-green-800 border-green-200' },
  warning: { icon: AlertCircle, classes: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  error: { icon: XCircle, classes: 'bg-red-50 text-red-800 border-red-200' },
};

export function Alert({ variant = 'info', children }: { variant?: AlertVariant; children: ReactNode }) {
  const { icon: Icon, classes } = config[variant];
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${classes}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
