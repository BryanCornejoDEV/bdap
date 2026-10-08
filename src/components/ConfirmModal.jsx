import Modal from "./Modal";
import { IconAlertTriangle } from "./icons";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "¿Estás seguro?",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isDanger = true,
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex gap-4">
        {isDanger && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            aria-hidden="true"
          >
            <IconAlertTriangle size={20} />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
            {message}
          </p>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="btn btn-ghost"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={isDanger ? "btn btn-danger" : "btn btn-primary"}
        >
          {loading ? "Procesando…" : confirmText}
        </button>
      </div>
    </Modal>
  );
}
