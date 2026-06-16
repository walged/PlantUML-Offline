import { ReactNode, useId } from "react";
import { useModalA11y } from "../../lib/useModalA11y";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Extra className for the dialog box (e.g. "update-modal"). */
  className?: string;
  closeLabel?: string;
}

/**
 * Accessible modal dialog: Escape closes, focus is trapped and restored, ARIA
 * roles are set, and clicking the overlay closes it (UI audit #4).
 */
export function Modal({ title, onClose, children, className, closeLabel }: ModalProps) {
  const ref = useModalA11y(onClose);
  const titleId = useId();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={ref}
        className={`modal ${className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label={closeLabel || "Close"}>
            ×
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}
