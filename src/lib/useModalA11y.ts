import { useEffect, useRef } from "react";

/**
 * Accessibility helpers for modal dialogs (UI audit #4):
 *  - Escape closes the modal.
 *  - Focus is moved into the dialog on open and restored to the trigger on close.
 *  - Tab/Shift+Tab are trapped within the dialog.
 *
 * Returns a ref to attach to the dialog container element.
 *
 * The effect runs exactly once (on mount/unmount). `onClose` is read through a
 * ref so that an unstable inline `onClose` prop does not re-run the effect on
 * every parent render — which would otherwise steal focus mid-interaction and
 * corrupt the "restore focus to trigger" behaviour.
 */
export function useModalA11y(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];

    // Move focus into the dialog.
    const first = focusables()[0];
    (first ?? node)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    node?.addEventListener("keydown", handleKeyDown);
    return () => {
      node?.removeEventListener("keydown", handleKeyDown);
      // Restore focus to whatever opened the modal.
      previouslyFocused?.focus?.();
    };
    // Run once for the lifetime of the modal; onClose is read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
