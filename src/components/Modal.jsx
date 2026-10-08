import { useEffect } from "react";
import { IconX } from "./icons";

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`card w-full ${maxWidth} overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150`}
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--text)" }}>{title}</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-icon"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
