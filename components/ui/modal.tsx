"use client";

import { motion } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

const UKURAN: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  ariaLabel: string;
  /** Lebar maksimum panel. Default `md`. */
  size?: ModalSize;
  closeOnBackdrop?: boolean;
}

/**
 * Satu-satunya shell modal aplikasi.
 *
 * Panel selalu putih (`bg-white`, border `#E2E8F0`), beranimasi masuk, terkunci
 * setinggi viewport (`max-h-[calc(100dvh-2rem)]`), dan memakai kontrak flex:
 * header/footer `shrink-0`, body `flex-1 min-h-0 overflow-y-auto`.
 * Gunakan `ModalHeader`, `ModalBody`, dan `ModalFooter` agar tidak ada duplikasi.
 *
 * Escape menutup modal dan scroll halaman dikunci selama modal terbuka.
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-navy/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        data-lenis-prevent
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 360 }}
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${UKURAN[size]} flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl`}
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
  /** Elemen tambahan di sisi kanan (sebelum tombol tutup). */
  children?: ReactNode;
}

/** Header modal putih yang konsisten: judul, deskripsi opsional, ikon, tombol tutup. */
export function ModalHeader({
  title,
  description,
  icon: Icon,
  onClose,
  children,
}: ModalHeaderProps) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E2E8F0] px-6 py-4">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-secondary" />}
          <span className="truncate">{title}</span>
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-slate-muted">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {children}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-slate-muted transition-colors hover:bg-surface hover:text-navy"
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

/** Body modal: satu-satunya area yang boleh scroll. */
export function ModalBody({ children, className = "" }: ModalBodyProps) {
  return (
    <div
      className={`min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scrollbar-none p-6 ${className}`}
    >
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

/** Footer modal: aksi di kanan, selalu terlihat di bawah. */
export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#E2E8F0] bg-surface/40 px-6 py-4 ${className}`}
    >
      {children}
    </div>
  );
}
