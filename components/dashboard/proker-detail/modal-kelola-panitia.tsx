// components/dashboard/proker-detail/modal-kelola-panitia.tsx
"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { Users } from "lucide-react";
import { type StoOption, type ProkerData } from "./types";
import { PanitiaStrukturTab } from "./panitia-struktur-tab";
import { PanitiaCsvTab } from "./panitia-csv-tab";

interface Props {
  isOpen: boolean;
  proker: ProkerData;
  availableStos: StoOption[];
  onClose: () => void;
  setPesan: (p: { tipe: "sukses" | "error"; teks: string } | null) => void;
  isPending: boolean;
  startTransition: (cb: () => Promise<void>) => void;
}

export function ModalKelolaPanitia({
  isOpen,
  proker,
  availableStos,
  onClose,
  setPesan,
  isPending,
  startTransition,
}: Props) {
  const [tabModal, setTabModal] = useState<"struktur" | "csv">("struktur");

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} ariaLabel="Kelola Susunan Panitia" size="2xl">
      <ModalHeader
        title="Kelola Susunan Panitia"
        description={`${proker.nama} • Periode ${proker.periode.nama}`}
        icon={Users}
        onClose={onClose}
      />

      <div className="px-6 pt-3 border-b border-[#E2E8F0] flex items-center gap-4 bg-surface">
        <button
          type="button"
          onClick={() => setTabModal("struktur")}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            tabModal === "struktur"
              ? "border-secondary text-secondary"
              : "border-transparent text-slate-muted hover:text-navy"
          }`}
        >
          Form Struktur Panitia
        </button>
        <button
          type="button"
          onClick={() => setTabModal("csv")}
          className={`pb-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            tabModal === "csv"
              ? "border-secondary text-secondary"
              : "border-transparent text-slate-muted hover:text-navy"
          }`}
        >
          Impor CSV Massal
        </button>
      </div>

      <ModalBody>
        {tabModal === "struktur" ? (
          <PanitiaStrukturTab
            proker={proker}
            availableStos={availableStos}
            onClose={onClose}
            setPesan={setPesan}
            isPending={isPending}
            startTransition={startTransition}
          />
        ) : (
          <PanitiaCsvTab
            proker={proker}
            availableStos={availableStos}
            onClose={onClose}
            setPesan={setPesan}
            isPending={isPending}
            startTransition={startTransition}
          />
        )}
      </ModalBody>
    </Modal>
  );
}
