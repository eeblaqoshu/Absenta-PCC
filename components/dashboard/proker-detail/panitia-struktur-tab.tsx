// components/dashboard/proker-detail/panitia-struktur-tab.tsx
"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  DAFTAR_SARAN_PERAN,
  isSekretarisUmum,
  isDivisiLitbang,
  isPeranLitbangPengawas,
  normalisasiPeranPanitia,
  type BarisFormPanitia,
  type StoOption,
  type ProkerData,
  type BarisPanitiaInput,
} from "./types";
import { tambahBanyakPanitiaAction } from "@/lib/actions/kepanitiaan";

interface Props {
  proker: ProkerData;
  availableStos: StoOption[];
  onClose: () => void;
  setPesan: (p: { tipe: "sukses" | "error"; teks: string } | null) => void;
  isPending: boolean;
  startTransition: (cb: () => Promise<void>) => void;
}

export function PanitiaStrukturTab({
  proker,
  availableStos,
  onClose,
  setPesan,
  isPending,
  startTransition,
}: Props) {
  const panitiaStoIdSet = new Set(proker.kepanitiaan.map((k) => k.sto.id));
  const stoBelumMasuk = availableStos.filter((s) => !panitiaStoIdSet.has(s.id));

  const [barisStruktur, setBarisStruktur] = useState<BarisFormPanitia[]>([
    {
      tempId: "row-init-1",
      stoId: "",
      peranTeks: "Ketua Pelaksana",
      divisiPanitia: "",
    },
  ]);

  const tambahBaris = (preset?: Partial<BarisFormPanitia>) => {
    setBarisStruktur((prev) => [
      ...prev,
      {
        tempId: Math.random().toString(36).substring(2, 9),
        stoId: preset?.stoId || "",
        peranTeks: preset?.peranTeks || "Anggota Sie Acara",
        divisiPanitia: preset?.divisiPanitia || "",
      },
    ]);
  };

  const ubahBaris = (tempId: string, patch: Partial<BarisFormPanitia>) => {
    setBarisStruktur((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, ...patch };
        if (patch.stoId) {
          const stoDipilih = availableStos.find(
            (s) => String(s.id) === String(patch.stoId),
          );
          if (stoDipilih) {
            updated.divisiPanitia = stoDipilih.divisi || "Umum";
          }
        }
        return updated;
      }),
    );
  };

  const hapusBaris = (tempId: string) => {
    setBarisStruktur((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleSubmitBanyakPanitia = (e: React.FormEvent) => {
    e.preventDefault();
    if (barisStruktur.length === 0) return;
    setPesan(null);

    const invalidRow = barisStruktur.find((b) => !b.stoId || !b.peranTeks.trim());
    if (invalidRow) {
      setPesan({
        tipe: "error",
        teks: "Harap pilih pengurus STO dan isi peran kepanitiaan pada setiap baris panitia.",
      });
      return;
    }

    const stoIds = barisStruktur.map((b) => Number(b.stoId));
    if (new Set(stoIds).size !== stoIds.length) {
      setPesan({
        tipe: "error",
        teks: "Terdapat duplikasi pengurus STO pada form. Pastikan tiap pengurus hanya dipilih satu kali.",
      });
      return;
    }

    for (const baris of barisStruktur) {
      if (baris.stoId) {
        const stoDipilih = availableStos.find(
          (s) => String(s.id) === String(baris.stoId),
        );
        if (
          baris.peranTeks.trim().toLowerCase().includes("sekretaris inti") &&
          stoDipilih &&
          isSekretarisUmum(stoDipilih)
        ) {
          setPesan({
            tipe: "error",
            teks: `Pengurus "${stoDipilih.nama}" menjabat sebagai Sekretaris Umum dan tidak dapat ditugaskan sebagai Sekretaris Inti kepanitiaan.`,
          });
          return;
        }
        if (
          stoDipilih &&
          isDivisiLitbang(stoDipilih) &&
          !isPeranLitbangPengawas(baris.peranTeks, baris.peranTeks)
        ) {
          setPesan({
            tipe: "error",
            teks: `Pengurus "${stoDipilih.nama}" dari Divisi Litbang hanya dapat ditugaskan sebagai Litbang Pengawas.`,
          });
          return;
        }
      }
    }

    const payload: BarisPanitiaInput[] = barisStruktur.map((b) => {
      const norm = normalisasiPeranPanitia(b.peranTeks, b.divisiPanitia);
      return {
        stoId: Number(b.stoId),
        peran: norm.peran,
        peranTeks: b.peranTeks.trim(),
        divisiPanitia: b.peranTeks.trim() || norm.divisiPanitia,
      };
    });

    startTransition(async () => {
      const res = await tambahBanyakPanitiaAction(proker.id, payload);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({
          tipe: "sukses",
          teks:
            res.pesan ||
            `${res.totalBerhasil} panitia berhasil ditambahkan ke susunan kepanitiaan.`,
        });
        onClose();
        setBarisStruktur([]);
      }
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Bagian Atas Fixed: Banner & Tombol Tambah Manual */}
      <div className="shrink-0 px-6 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-surface border border-[#E2E8F0]">
          <div className="text-xs text-navy">
            <span className="font-semibold">Susun Kepanitiaan Manual</span>:{" "}
            Pilih peran dan tunjuk pengurus STO secara manual untuk program kerja ini.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => tambahBaris()}
              disabled={stoBelumMasuk.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Baris Panitia
            </button>
          </div>
        </div>
      </div>

      {/* Bagian Tengah Scrollable: List Data Panitia */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 space-y-2.5">
        {barisStruktur.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-surface/50 my-auto">
            <Users className="w-8 h-8 text-slate-muted mx-auto mb-2" />
            <p className="text-xs font-semibold text-navy">
              Belum ada baris panitia yang ditambahkan
            </p>
            <p className="text-[11px] text-slate-muted mt-0.5 mb-3">
              Klik tombol di bawah untuk mulai menyusun kepanitiaan.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => tambahBaris()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Pertama
              </button>
            </div>
          </div>
        ) : (
          barisStruktur.map((baris, idx) => {
            const selectedInOtherRows = new Set(
              barisStruktur
                .filter((b) => b.tempId !== baris.tempId)
                .map((b) => Number(b.stoId))
                .filter(Boolean),
            );
            const isDuplikat =
              baris.stoId &&
              barisStruktur.filter((b) => b.stoId === baris.stoId).length > 1;

            const stoDipilih = availableStos.find(
              (s) => String(s.id) === String(baris.stoId),
            );
            const isSekumSebagaiSekretarisInti =
              baris.peranTeks.trim().toLowerCase().includes("sekretaris inti") &&
              isSekretarisUmum(stoDipilih);
            const isLitbangBukanPengawas =
              stoDipilih &&
              isDivisiLitbang(stoDipilih) &&
              !isPeranLitbangPengawas(baris.peranTeks, baris.peranTeks);

            return (
              <div
                key={baris.tempId}
                className={`p-3 rounded-2xl border transition-all ${
                  isDuplikat ||
                  isSekumSebagaiSekretarisInti ||
                  isLitbangBukanPengawas
                    ? "border-rose-300 bg-rose-50/40"
                    : "border-[#E2E8F0] bg-white hover:border-secondary/40"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                  {/* Kolom 1: Peran Kepanitiaan */}
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-muted mb-1">
                      Peran Kepanitiaan #{idx + 1}
                    </label>
                    <input
                      type="text"
                      list="daftar-saran-peran-modal"
                      value={baris.peranTeks}
                      onChange={(e) =>
                        ubahBaris(baris.tempId, { peranTeks: e.target.value })
                      }
                      placeholder="Ketik peran, cth: Ketua Pelaksana / Sie Acara"
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy placeholder:text-slate-muted focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                    />
                  </div>

                  {/* Kolom 2: Nama Pengurus STO */}
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-muted mb-1">
                      Pengurus STO
                    </label>
                    <select
                      value={baris.stoId}
                      onChange={(e) =>
                        ubahBaris(baris.tempId, { stoId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                    >
                      <option value="">-- Pilih Pengurus STO --</option>
                      {availableStos
                        .filter((s) => {
                          const sudahDiProker = panitiaStoIdSet.has(s.id);
                          const sudahDiBarisLain = selectedInOtherRows.has(s.id);
                          const isRowIni = String(s.id) === String(baris.stoId);
                          return (!sudahDiProker && !sudahDiBarisLain) || isRowIni;
                        })
                        .map((s) => {
                          const isLitbang = isDivisiLitbang(s);
                          const disabledLitbang =
                            isLitbang &&
                            !isPeranLitbangPengawas(baris.peranTeks, baris.peranTeks);
                          return (
                            <option
                              key={s.id}
                              value={s.id}
                              disabled={disabledLitbang}
                            >
                              {s.nama} ({s.nim})
                              {disabledLitbang
                                ? " - Khusus Litbang Pengawas"
                                : s.divisi
                                  ? ` - ${s.divisi}`
                                  : ""}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  {/* Kolom 3: Divisi STO */}
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-muted mb-1">
                      Divisi STO
                    </label>
                    <input
                      type="text"
                      value={baris.divisiPanitia}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] bg-surface text-xs text-navy font-medium truncate select-none"
                    />
                  </div>

                  {/* Kolom 4: Hapus Baris */}
                  <div className="md:col-span-1 flex items-center justify-end pt-4 md:pt-0">
                    <button
                      type="button"
                      onClick={() => hapusBaris(baris.tempId)}
                      className="p-2 rounded-xl text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus Baris"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isSekumSebagaiSekretarisInti && (
                  <p className="text-[10px] text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Sekretaris Umum tidak dapat ditugaskan sebagai Sekretaris Inti.
                  </p>
                )}
                {isLitbangBukanPengawas && (
                  <p className="text-[10px] text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Pengurus dari Divisi Litbang ({stoDipilih?.nama}) hanya dapat ditugaskan sebagai Litbang Pengawas.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bagian Bawah Fixed: Tombol Aksi Bawah */}
      <div className="shrink-0 px-6 py-3.5 border-t border-[#E2E8F0] bg-white sm:bg-surface/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => tambahBaris()}
              disabled={stoBelumMasuk.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-navy text-xs font-semibold hover:bg-surface shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-secondary" />
              Tambah Baris Panitia
            </button>
            <span className="text-xs text-slate-muted">
              Tersisa {Math.max(0, stoBelumMasuk.length - barisStruktur.length)} STO belum masuk
            </span>
          </div>

          <button
            type="button"
            disabled={isPending || barisStruktur.length === 0}
            onClick={handleSubmitBanyakPanitia}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-50 shadow-md shadow-secondary/25 transition-all cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Simpan Struktur Panitia ({barisStruktur.length})
          </button>
        </div>
      </div>

      {/* Datalist saran peran */}
      <datalist id="daftar-saran-peran-modal">
        {DAFTAR_SARAN_PERAN.map((saran) => (
          <option key={saran} value={saran} />
        ))}
      </datalist>
    </div>
  );
}
