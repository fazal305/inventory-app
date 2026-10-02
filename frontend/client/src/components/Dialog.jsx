import { useEffect, useId, useRef } from 'react';

/**
 * Modal built on the native <dialog> element: focus trapping, Escape to close and
 * inert background come from the browser. Focus returns to the opener on close.
 */
export default function Dialog({ open, onClose, title, description, children, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const opener = document.activeElement;
      dialog.showModal();
      return () => {
        if (dialog.open) dialog.close();
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      };
    }
    return undefined;
  }, [open]);

  function handleCancel(event) {
    event.preventDefault();
    if (!busy) onClose();
  }

  function handleBackdropClick(event) {
    if (event.target === ref.current && !busy) onClose();
  }

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="dialog__panel">
        <h2 id={titleId} className="dialog__title">
          {title}
        </h2>
        {description && (
          <p id={descId} className="dialog__description">
            {description}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
