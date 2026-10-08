import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { IconCheck, IconAlertTriangle, IconX } from "../components/icons";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useMemo(
    () => ({
      success: (msg, dur) => addToast("success", msg, dur),
      error: (msg, dur) => addToast("error", msg, dur),
      info: (msg, dur) => addToast("info", msg, dur),
    }),
    [addToast]
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const isError = t.type === "error";
          const isSuccess = t.type === "success";

          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-3 duration-200"
              style={{
                background: "var(--surface)",
                borderColor: isError
                  ? "var(--danger)"
                  : isSuccess
                  ? "var(--success)"
                  : "var(--border)",
                color: "var(--text)",
              }}
              role="alert"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-xs"
                  style={{
                    background: isError
                      ? "var(--danger)"
                      : isSuccess
                      ? "var(--success)"
                      : "var(--accent)",
                  }}
                  aria-hidden="true"
                >
                  {isSuccess && <IconCheck size={14} />}
                  {isError && <IconAlertTriangle size={14} />}
                  {!isSuccess && !isError && "i"}
                </span>
                <p className="text-sm font-medium leading-snug break-words">{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="btn btn-ghost btn-sm btn-icon shrink-0 -mr-1"
                aria-label="Cerrar notificación"
              >
                <IconX size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    return {
      success: (msg) => console.log("[Toast success]:", msg),
      error: (msg) => console.error("[Toast error]:", msg),
      info: (msg) => console.log("[Toast info]:", msg),
    };
  }
  return ctx;
}
