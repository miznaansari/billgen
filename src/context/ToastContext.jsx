import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const STYLES = {
  success: { icon: CircleCheck, cls: "border-success/30 bg-success/10 text-success" },
  error: { icon: TriangleAlert, cls: "border-error/30 bg-error/10 text-error" },
  info: { icon: Info, cls: "border-info/30 bg-info/10 text-info" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (type, message, duration = 3500) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, type, message }]);
      if (duration) setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Bottom-center on mobile (above tab bar), top-right on desktop */}
      <div className="fixed z-[90] inset-x-3 bottom-20 flex flex-col items-center gap-2 pointer-events-none lg:inset-x-auto lg:bottom-auto lg:top-5 lg:right-5 lg:items-end">
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur bg-base-100/95 ${cls}`}
            >
              <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <p className="flex-1 text-sm font-medium text-base-content">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-0.5 text-base-content/40 hover:text-base-content"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
