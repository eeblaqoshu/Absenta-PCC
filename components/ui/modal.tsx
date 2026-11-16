"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  ariaLabel: string;
  closeOnBackdrop?: boolean;
  overlayClassName?: string;
}

/**
 * Shared modal shell: locks page scrolling and keeps wheel input inside the modal.
 * The dialog wrapper has a fixed height (viewport minus padding) so panels can stay
 * put: give the panel `max-h-full min-h-0 flex flex-col`, keep header/footer
 * `shrink-0`, and make only the body `flex-1 min-h-0 overflow-y-auto scrollbar-none`.
 */
export function Modal({
  children,
  onClose,
  ariaLabel,
  closeOnBackdrop = true,
  overlayClassName = "",
}: ModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-sm ${overlayClassName}`}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        data-lenis-prevent
        className="flex h-full min-h-0 w-full flex-col justify-center overflow-hidden overscroll-contain"
      >
        {children}
      </div>
    </div>
  );
}
