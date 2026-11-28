// components/dashboard/proker-detail/kelola-panitia-page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  DAFTAR_SARAN_PERAN,
  isSekretarisUmum,
  isDivisiLitbang,
  isPeranLitbangPengawas,
  isJabatanAdminOrSekum,
  validasiKesesuaianJabatanPi,
  normalisasiPeranPanitia,
  getLabelKategori,
  type BarisFormPanitia,
  type StoOption,
  type ProkerData,
  type BarisPanitiaInput,
} from "./types";
import { tambahBanyakPanitiaAction } from "@/lib/actions/kepanitiaan";
import { PanitiaCsvTab } from "./panitia-csv-tab";

interface Props {
  proker: ProkerData;
  availableStos: StoOption[];
}

export function KelolaPanitiaPage({ proker, availableStos }: Props) {
  const router = useRouter();
  const [tabAktif, setTabAktif] = useState<"struktur" | "csv">("struktur");
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  const isReadonly = proker.periode.status === "selesai";
  const labels = getLabelKategori(proker.kategori);

  // Inisialisasi baris form: muat kepanitiaan tersimpan bila ada
  const [barisStruktur, setBarisStruktur] = useState<BarisFormPanitia[]>(() => {
    if (proker.kepanitiaan && proker.kepanitiaan.length > 0) {
      return proker.kepanitiaan.map((k) => ({
        tempId: `panitia-${k.id}`,
        stoId: String(k.sto.id),
        peranTeks: k.divisiPanitia || (k.peran ? String(k.peran) : "Anggota"),
        divisiPanitia: k.sto.divisi || "Umum",
      }));
    }
    return [
      {
        tempId: "row-init-1",
        stoId: "",
        peranTeks: "Ketua Pelaksana",
        divisiPanitia: "",
      },
    ];
  });

  const stoIdTerpilihSet = new Set(
    barisStruktur.map((b) => Number(b.stoId)).filter(Boolean),
  );
  const stoTersisa = availableStos.filter(
    (s) => !isJabatanAdminOrSekum(s).dilarang && !stoIdTerpilihSet.has(s.id),
  );

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

    const invalidRow = barisStruktur.find(
      (b) => !b.stoId || !b.peranTeks.trim(),
    );
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
      const sto = availableStos.find(
        (s) => String(s.id) === String(baris.stoId),
      );
      if (sto) {
        const validasiPi = validasiKesesuaianJabatanPi(
          sto,
          baris.peranTeks,
          baris.divisiPanitia,
        );
        if (!validasiPi.valid) {
          setPesan({
            tipe: "error",
            teks: validasiPi.pesanError!,
          });
          return;
        }
        if (
          isDivisiLitbang(sto) &&
          !isPeranLitbangPengawas(baris.peranTeks, baris.peranTeks)
        ) {
          setPesan({
            tipe: "error",
            teks: `Pengurus dari Divisi Litbang (${sto?.nama}) hanya dapat ditugaskan sebagai Litbang Pengawas.`,
          });
          return;
        }
      }
    }

    const inputData: BarisPanitiaInput[] = barisStruktur.map((b) => {
      const norm = normalisasiPeranPanitia(b.peranTeks, b.divisiPanitia);
      return {
        stoId: Number(b.stoId),
        peran: norm.peran,
        peranTeks: b.peranTeks.trim(),
        divisiPanitia: b.peranTeks.trim() || norm.divisiPanitia,
      };
    });

    startTransition(async () => {
      const res = await tambahBanyakPanitiaAction(proker.id, inputData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        router.push(`/dashboard/proker/${proker.id}`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Navigasi Kembali */}
      <div>
        <Link
          href={`/dashboard/proker/${proker.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Detail {labels.singkat}
        </Link>
      </div>

      {/* Header Banner Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-muted">
              Portal Kepanitiaan {labels.kapital}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            {proker.kepanitiaan.length > 0
              ? "Kelola & Ubah Susunan Panitia"
              : "Susun Kepanitiaan Baru"}
          </h1>
          <p className="text-xs text-slate-muted mt-1 flex items-center gap-2 flex-wrap">
            <span>{proker.nama} • Periode {proker.periode.nama}</span>
            <span className="text-slate-muted text-xs">•</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                labels.isAgenda
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {labels.kategoriLabel}
            </span>
            {proker.kepanitiaan.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/10 text-secondary border border-secondary/20">
                {barisStruktur.length} Panitia Terdaftar
              </span>
            )}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface border border-[#E2E8F0] shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setTabAktif("struktur")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tabAktif === "struktur"
                ? "bg-white text-secondary shadow-xs border border-[#CBD5E1]/60"
                : "text-slate-muted hover:text-navy"
            }`}
          >
            <Users className="w-4 h-4" />
            Form Struktur Panitia
          </button>
          <button
            type="button"
            onClick={() => setTabAktif("csv")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              tabAktif === "csv"
                ? "bg-white text-secondary shadow-xs border border-[#CBD5E1]/60"
                : "text-slate-muted hover:text-navy"
            }`}
          >
            <Upload className="w-4 h-4" />
            Impor CSV Massal
          </button>
        </div>
      </div>

      {/* 2. Notification Alert */}
      {pesan && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
            pesan.tipe === "sukses"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{pesan.teks}</div>
          <button
            onClick={() => setPesan(null)}
            className="text-slate-muted hover:text-navy cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Main Content based on Tab */}
      {tabAktif === "struktur" ? (
        <div className="space-y-6">
          {/* Quick Action & Info Banner */}
          <div className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                Susun Kepanitiaan Manual
              </h3>
              <p className="text-xs text-slate-muted">
                Pilih peran dan tunjuk pengurus STO secara manual untuk {labels.lengkap} ini.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => tambahBaris()}
                disabled={stoTersisa.length === 0 || isReadonly}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Tambah Baris Panitia
              </button>
            </div>
          </div>

          {/* List of Cards Form */}
          {barisStruktur.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white">
              <Users className="w-10 h-10 text-slate-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy">
                Belum ada baris panitia yang ditambahkan
              </p>
              <p className="text-xs text-slate-muted mt-1 mb-4">
                Klik tombol di bawah untuk mulai menyusun kepanitiaan.
              </p>
              <button
                type="button"
                onClick={() => tambahBaris()}
                disabled={isReadonly}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Tambah Baris Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {barisStruktur.map((baris, idx) => {
                const selectedInOtherRows = new Set(
                  barisStruktur
                    .filter((b) => b.tempId !== baris.tempId)
                    .map((b) => Number(b.stoId))
                    .filter(Boolean),
                );
                const isDuplikat =
                  baris.stoId &&
                  barisStruktur.filter((b) => b.stoId === baris.stoId).length >
                    1;

                const stoDipilih = availableStos.find(
                  (s) => String(s.id) === String(baris.stoId),
                );
                const validasiPi = stoDipilih
                  ? validasiKesesuaianJabatanPi(
                      stoDipilih,
                      baris.peranTeks,
                      baris.divisiPanitia,
                    )
                  : { valid: true };
                const isPiTidakSesuai = !validasiPi.valid;
                const isLitbangBukanPengawas =
                  stoDipilih &&
                  isDivisiLitbang(stoDipilih) &&
                  !isPeranLitbangPengawas(baris.peranTeks, baris.peranTeks);

                return (
                  <div
                    key={baris.tempId}
                    className={`p-4 sm:p-5 rounded-3xl border bg-white shadow-xs transition-all ${
                      isDuplikat ||
                      isPiTidakSesuai ||
                      isLitbangBukanPengawas
                        ? "border-rose-300 ring-2 ring-rose-100"
                        : "border-[#E2E8F0] hover:border-secondary/40"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
                      {/* Kolom 1: Peran Kepanitiaan (Pertama) */}
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-bold text-navy mb-1.5">
                          Peran Kepanitiaan #{idx + 1}
                        </label>
                        <input
                          type="text"
                          list="daftar-saran-peran"
                          value={baris.peranTeks}
                          onChange={(e) =>
                            ubahBaris(baris.tempId, {
                              peranTeks: e.target.value,
                            })
                          }
                          placeholder="Ketik peran, cth: Ketua Pelaksana / Sie Acara"
                          disabled={isReadonly}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy font-medium placeholder:text-slate-muted focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                        />
                      </div>

                      {/* Kolom 2: Nama Pengurus STO (Kedua) */}
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-bold text-navy mb-1.5">
                          Nama Pengurus STO
                        </label>
                        <select
                          value={baris.stoId}
                          onChange={(e) =>
                            ubahBaris(baris.tempId, { stoId: e.target.value })
                          }
                          disabled={isReadonly}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy font-medium focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                        >
                          <option value="">-- Pilih Pengurus STO --</option>
                          {availableStos
                            .filter((s) => {
                              // Sembunyikan Admin & Sekum (dilarang masuk kepanitiaan)
                              if (isJabatanAdminOrSekum(s).dilarang) return false;

                              // Sembunyikan jika tidak sesuai dengan peran yang diketik
                              if (baris.peranTeks.trim()) {
                                if (
                                  !validasiKesesuaianJabatanPi(
                                    s,
                                    baris.peranTeks,
                                  ).valid
                                ) {
                                  return false;
                                }
                                if (
                                  isDivisiLitbang(s) &&
                                  !isPeranLitbangPengawas(
                                    baris.peranTeks,
                                    baris.peranTeks,
                                  )
                                ) {
                                  return false;
                                }
                              }

                              const sudahDiBarisLain = selectedInOtherRows.has(
                                s.id,
                              );
                              const isRowIni =
                                String(s.id) === String(baris.stoId);
                              return !sudahDiBarisLain || isRowIni;
                            })
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nama}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Kolom 3: Divisi STO (Ketiga) */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-bold text-navy mb-1.5">
                          Divisi STO
                        </label>
                        <input
                          type="text"
                          value={baris.divisiPanitia}
                          readOnly
                          placeholder="Divisi terdaftar"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-surface text-xs text-navy font-medium truncate select-none cursor-default"
                        />
                      </div>

                      {/* Kolom 4: Tombol Hapus */}
                      <div className="md:col-span-1 flex items-center justify-end pt-2 md:pt-6">
                        <button
                          type="button"
                          onClick={() => hapusBaris(baris.tempId)}
                          disabled={isReadonly}
                          className="p-2 rounded-xl text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Hapus Baris Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Alert Validasi Baris */}
                    {isDuplikat && (
                      <p className="text-xs text-rose-600 mt-2.5 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Pengurus ini sudah dipilih pada baris lain.
                      </p>
                    )}
                    {isPiTidakSesuai && (
                      <p className="text-xs text-rose-600 mt-2.5 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {validasiPi.pesanError}
                      </p>
                    )}
                    {isLitbangBukanPengawas && (
                      <p className="text-xs text-rose-600 mt-2.5 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Pengurus dari Divisi Litbang ({stoDipilih?.nama}) hanya
                        dapat ditugaskan sebagai Litbang Pengawas.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-4 left-4 right-4 max-w-7xl mx-auto z-40">
            <div className="p-4 rounded-3xl bg-white/95 backdrop-blur-md border border-[#E2E8F0] shadow-xl shadow-navy/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => tambahBaris()}
                  disabled={stoTersisa.length === 0 || isReadonly}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-surface text-navy text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-secondary" />
                  Tambah Baris Panitia
                </button>
                <span className="text-xs text-slate-muted">
                  Tersisa{" "}
                  <strong className="text-navy font-bold">
                    {stoTersisa.length}
                  </strong>{" "}
                  pengurus STO yang dapat ditambahkan
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <Link
                  href={`/dashboard/proker/${proker.id}`}
                  className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-navy text-xs font-semibold hover:bg-surface transition-colors"
                >
                  Batal
                </Link>
                <button
                  type="button"
                  disabled={
                    isPending || barisStruktur.length === 0 || isReadonly
                  }
                  onClick={handleSubmitBanyakPanitia}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-50 shadow-md shadow-secondary/25 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {proker.kepanitiaan.length > 0
                    ? "Simpan Perubahan Susunan Panitia"
                    : "Simpan Susunan Panitia"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Impor CSV Massal */
        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm">
          <PanitiaCsvTab
            proker={proker}
            availableStos={availableStos}
            onClose={() => {
              router.push(`/dashboard/proker/${proker.id}`);
              router.refresh();
            }}
            setPesan={setPesan}
            isPending={isPending}
            startTransition={startTransition}
          />
        </div>
      )}
      {/* Datalist saran peran */}
      <datalist id="daftar-saran-peran">
        {DAFTAR_SARAN_PERAN.map((saran) => (
          <option key={saran} value={saran} />
        ))}
      </datalist>
    </div>
  );
}
