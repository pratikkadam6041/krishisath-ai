import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   AlertTriangle,
  info:    Info,
};

const COLORS = {
  success: 'bg-primary text-white',
  warning: 'bg-accent-amber text-gray-900',
  error:   'bg-danger text-white',
  info:    'bg-water text-white',
};

let showToastFn = null;

export function showToast(message, type = 'success', duration = 3000) {
  if (showToastFn) showToastFn({ message, type, duration });
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    showToastFn = ({ message, type, duration }) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    };
    return () => { showToastFn = null; };
  }, []);

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(({ id, message, type }) => {
        const Icon = ICONS[type] || Info;
        return (
          <div
            key={id}
            className={`toast-in flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto ${COLORS[type] || COLORS.info}`}
            id={`toast-${id}`}
            role="status"
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-sm font-semibold flex-1">{message}</span>
          </div>
        );
      })}
    </div>
  );
}
