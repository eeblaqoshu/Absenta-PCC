// components/ui/modal.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";

const UKURAN: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  ariaLabel: string;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
}

/**
 * Shell modal aplikasi bergaya Albi:
 * - Backdrop dengan animasi fade in / out (`bg-navy/50 backdrop-blur-sm`).
 * - Card putih beranimasi spring pop in / out (`damping: 28, stiffness: 360`, scale & y).
 * - Border halus `#E2E8F0` dengan sudut membulat `rounded-2xl` & shadow `shadow-2xl`.
 */
export function Modal({
  children,
  onClose,
  ariaLabel,
  size = "md",
  closeOnBackdrop = true,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        className="fixed inset-0 bg-navy/50 backdrop-blur-sm"
      />

      {/* Modal Dialog Card */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        data-lenis-prevent
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: "spring", damping: 28, stiffness: 360 }}
        className={`relative z-10 flex max-h-[calc(100dvh-2rem)] w-full ${UKURAN[size]} flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl`}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface ModalHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  onClose?: () => void;
  children?: ReactNode;
}

/** Header modal Albi: judul tebal primary, deskripsi muted kecil, tombol close X dengan cursor-pointer */
export function ModalHeader({
  title,
  description,
  icon: Icon,
  onClose,
  children,
}: ModalHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
      <div className="min-w-0 pr-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-secondary" />}
          <span className="truncate">{title}</span>
        </h3>
        {description && (
          <p className="mt-0.5 text-[11px] text-slate-muted">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="cursor-pointer rounded-lg p-1 text-slate-muted transition-colors hover:bg-surface hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

/** Body modal scrollable dengan padding konsisten */
export function ModalBody({ children, className = "" }: ModalBodyProps) {
  return (
    <div
      className={`min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-6 ${className}`}
    >
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

/** Footer modal aksi di kanan dengan border dan background Albi */
export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#E2E8F0] bg-surface/50 px-6 py-4 ${className}`}
    >
      {children}
    </div>
  );
}
