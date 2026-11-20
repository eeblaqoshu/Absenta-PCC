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
  OPSI_PERAN_PANITIA,
  isSekretarisUmum,
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
  const panitiaStoIdSet = new Set(proker.kepanitiaan.map((k) => k.sto.id));
  const stoBelumMasuk = availableStos.filter((s) => !panitiaStoIdSet.has(s.id));

  // Inisialisasi baris pertama form
  const [barisStruktur, setBarisStruktur] = useState<BarisFormPanitia[]>(() => {
    const firstAvailable = availableStos.find(
      (s) => !panitiaStoIdSet.has(s.id) && !isSekretarisUmum(s),
    );
    return [
      {
        tempId: Math.random().toString(36).substring(2, 9),
        stoId: firstAvailable ? String(firstAvailable.id) : "",
        roleKey: "ketua_pelaksana",
        divisiPanitia: firstAvailable?.divisi || "Pengurus Inti",
      },
    ];
  });

  const tambahBaris = (preset?: Partial<BarisFormPanitia>) => {
    const usedIds = new Set([
      ...panitiaStoIdSet,
      ...barisStruktur.map((b) => Number(b.stoId)).filter(Boolean),
    ]);
    const firstAvailable = availableStos.find(
      (s) => !usedIds.has(s.id) && !isSekretarisUmum(s),
    );

    let roleKey = preset?.roleKey;
    if (!roleKey) {
      const existingRoles = new Set(barisStruktur.map((b) => b.roleKey));
      if (existingRoles.has("ketua_pelaksana")) {
        const nextAvailableRole = OPSI_PERAN_PANITIA.find(
          (o) => !existingRoles.has(o.key) && !o.kategori.includes("PI"),
        );
        roleKey = nextAvailableRole ? nextAvailableRole.key : "anggota_sie_acara";
      } else {
        roleKey = OPSI_PERAN_PANITIA[0].key;
      }
    }

    setBarisStruktur((prev) => [
      ...prev,
      {
        tempId: Math.random().toString(36).substring(2, 9),
        stoId:
          preset?.stoId || (firstAvailable ? String(firstAvailable.id) : ""),
        roleKey,
        divisiPanitia:
          preset?.divisiPanitia ?? (firstAvailable?.divisi || "Umum"),
      },
    ]);
  };

  const terapkanPresetInti = () => {
    const validRows = barisStruktur.filter((b) => Boolean(b.stoId));
    const existingRolesInForm = new Set(validRows.map((b) => b.roleKey));

    const existingRolesInKepanitiaan = new Set<string>();
    for (const k of proker.kepanitiaan) {
      const match = OPSI_PERAN_PANITIA.find(
        (o) =>
          o.label.toLowerCase() === (k.divisiPanitia || "").toLowerCase() ||
          (o.key === "ketua_pelaksana" && k.peran === "ketua") ||
          (o.key === "wakil_ketua_pelaksana" &&
            (k.divisiPanitia || "").toLowerCase().includes("wakil")) ||
          (o.key === "sekretaris_inti" &&
            (k.divisiPanitia || "").toLowerCase().includes("sekretaris inti")) ||
          (o.key === "sekretaris_pelaksana" &&
            (k.peran === "sekretaris" ||
              (k.divisiPanitia || "").toLowerCase().includes("sekretaris pelaksana"))) ||
          (o.key === "bendahara_inti" &&
            (k.divisiPanitia || "").toLowerCase().includes("bendahara inti")) ||
          (o.key === "bendahara_pelaksana" &&
            (k.peran === "bendahara" ||
              (k.divisiPanitia || "").toLowerCase().includes("bendahara pelaksana"))) ||
          (o.key === "litbang_pengawas" &&
            (k.divisiPanitia || "").toLowerCase().includes("litbang")),
      );
      if (match) {
        existingRolesInKepanitiaan.add(match.key);
      }
    }

    const presets: {
      roleKey: string;
      kriteria?: "sekretaris" | "bendahara" | "litbang";
    }[] = [
      { roleKey: "ketua_pelaksana" },
      { roleKey: "wakil_ketua_pelaksana" },
      { roleKey: "sekretaris_inti", kriteria: "sekretaris" },
      { roleKey: "sekretaris_pelaksana" },
      { roleKey: "bendahara_inti", kriteria: "bendahara" },
      { roleKey: "bendahara_pelaksana" },
      { roleKey: "litbang_pengawas", kriteria: "litbang" },
    ];

    const presetsNeeded = presets.filter(
      (p) =>
        !existingRolesInForm.has(p.roleKey) &&
        !existingRolesInKepanitiaan.has(p.roleKey),
    );

    if (presetsNeeded.length === 0) {
      setPesan({
        tipe: "sukses",
        teks: "Semua peran Kepanitiaan Inti (Ketua, Wakil, Sekretaris, Bendahara, dan Litbang Pengawas) sudah terisi lengkap.",
      });
      return;
    }

    const currentUsedIds = new Set([
      ...panitiaStoIdSet,
      ...barisStruktur.map((b) => Number(b.stoId)).filter(Boolean),
    ]);

    const pilihStoUntukPreset = (
      kriteria?: "sekretaris" | "bendahara" | "litbang",
    ) => {
      if (kriteria === "sekretaris") {
        const sekMatch = availableStos.find(
          (s) =>
            !currentUsedIds.has(s.id) &&
            !isSekretarisUmum(s) &&
            ((s.jabatan || "").toLowerCase().includes("sekretaris") ||
              (s.divisi || "").toLowerCase().includes("sekretaris")),
        );
        if (sekMatch) {
          currentUsedIds.add(sekMatch.id);
          return sekMatch;
        }
      }

      if (kriteria === "bendahara") {
        const benMatch = availableStos.find(
          (s) =>
            !currentUsedIds.has(s.id) &&
            !isSekretarisUmum(s) &&
            ((s.jabatan || "").toLowerCase().includes("bendahara") ||
              (s.divisi || "").toLowerCase().includes("bendahara") ||
              (s.divisi || "").toLowerCase().includes("keuangan")),
        );
        if (benMatch) {
          currentUsedIds.add(benMatch.id);
          return benMatch;
        }
      }

      if (kriteria === "litbang") {
        const litMatch = availableStos.find(
          (s) =>
            !currentUsedIds.has(s.id) &&
            !isSekretarisUmum(s) &&
            ((s.jabatan || "").toLowerCase().includes("litbang") ||
              (s.divisi || "").toLowerCase().includes("litbang")),
        );
        if (litMatch) {
          currentUsedIds.add(litMatch.id);
          return litMatch;
        }
      }

      const generalMatch = availableStos.find(
        (s) => !currentUsedIds.has(s.id) && !isSekretarisUmum(s),
      );
      if (generalMatch) {
        currentUsedIds.add(generalMatch.id);
        return generalMatch;
      }

      return null;
    };

    const emptyRowIndices = barisStruktur
      .map((b, idx) => (!b.stoId ? idx : -1))
      .filter((idx) => idx !== -1);

    const updatedBaris = [...barisStruktur];
    const presetsToCreate = [...presetsNeeded];

    for (const emptyIdx of emptyRowIndices) {
      if (presetsToCreate.length === 0) break;
      const preset = presetsToCreate.shift()!;
      const sto = pilihStoUntukPreset(preset.kriteria);
      updatedBaris[emptyIdx] = {
        ...updatedBaris[emptyIdx],
        stoId: sto ? String(sto.id) : "",
        roleKey: preset.roleKey,
        divisiPanitia: sto?.divisi || "Pengurus Inti",
      };
    }

    const newRows: BarisFormPanitia[] = [];
    for (const preset of presetsToCreate) {
      const sto = pilihStoUntukPreset(preset.kriteria);
      newRows.push({
        tempId: Math.random().toString(36).substring(2, 9),
        stoId: sto ? String(sto.id) : "",
        roleKey: preset.roleKey,
        divisiPanitia: sto?.divisi || "Pengurus Inti",
      });
    }

    setBarisStruktur([...updatedBaris, ...newRows]);
    setPesan({
      tipe: "sukses",
      teks: `Berhasil menambahkan baris peran pimpinan inti. Silakan sesuaikan pengurus jika diperlukan.`,
    });
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

    const invalidRow = barisStruktur.find((b) => !b.stoId);
    if (invalidRow) {
      setPesan({
        tipe: "error",
        teks: "Harap pilih pengurus STO pada setiap baris panitia.",
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

    const peranIntiTunggal = [
      "ketua_pelaksana",
      "wakil_ketua_pelaksana",
      "sekretaris_inti",
      "sekretaris_pelaksana",
      "bendahara_inti",
      "bendahara_pelaksana",
      "litbang_pengawas",
    ];
    for (const rKey of peranIntiTunggal) {
      const match = barisStruktur.filter((b) => b.roleKey === rKey);
      if (match.length > 1) {
        const roleLabel =
          OPSI_PERAN_PANITIA.find((o) => o.key === rKey)?.label || rKey;
        setPesan({
          tipe: "error",
          teks: `Peran '${roleLabel}' hanya boleh diisi oleh 1 orang pengurus.`,
        });
        return;
      }
    }

    for (const baris of barisStruktur) {
      if (baris.roleKey === "sekretaris_inti") {
        const sto = availableStos.find((s) => String(s.id) === String(baris.stoId));
        if (isSekretarisUmum(sto)) {
          setPesan({
            tipe: "error",
            teks: `Sekretaris Umum (${sto?.nama}) tidak dapat ditugaskan sebagai Sekretaris Inti pada kepanitiaan ini.`,
          });
          return;
        }
      }
    }

    const inputData: BarisPanitiaInput[] = barisStruktur.map((b) => {
      const opsi = OPSI_PERAN_PANITIA.find((o) => o.key === b.roleKey);
      return {
        stoId: Number(b.stoId),
        peran: opsi?.peran || "anggota",
        divisiPanitia: opsi?.label || b.divisiPanitia,
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
          Kembali ke Detail Proker
        </Link>
      </div>

      {/* Header Banner Card */}
      <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-muted">
              Portal Kepanitiaan Program Kerja
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            Kelola Susunan Panitia
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            {proker.nama} • Periode {proker.periode.nama}
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
                Susun Kepanitiaan Sekaligus
              </h3>
              <p className="text-xs text-slate-muted">
                Tambahkan peran dan tunjuk pengurus STO dalam satu alur form yang cepat.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={terapkanPresetInti}
                disabled={stoBelumMasuk.length === 0 || isReadonly}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-secondary/30 bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                title="Terapkan 7 peran: Ketua, Wakil, Sekretaris Inti & Pelaksana, Bendahara Inti & Pelaksana, serta Litbang Pengawas"
              >
                Preset Pimpinan Inti
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
                  barisStruktur.filter((b) => b.stoId === baris.stoId).length > 1;

                const isDuplikatPeran =
                  [
                    "ketua_pelaksana",
                    "wakil_ketua_pelaksana",
                    "sekretaris_inti",
                    "sekretaris_pelaksana",
                    "bendahara_inti",
                    "bendahara_pelaksana",
                    "litbang_pengawas",
                  ].includes(baris.roleKey) &&
                  barisStruktur.filter((b) => b.roleKey === baris.roleKey).length > 1;

                const stoDipilih = availableStos.find(
                  (s) => String(s.id) === String(baris.stoId),
                );
                const isSekumSebagaiSekretarisInti =
                  baris.roleKey === "sekretaris_inti" &&
                  isSekretarisUmum(stoDipilih);

                return (
                  <div
                    key={baris.tempId}
                    className={`p-4 sm:p-5 rounded-3xl border bg-white shadow-xs transition-all ${
                      isDuplikat || isDuplikatPeran || isSekumSebagaiSekretarisInti
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
                        <select
                          value={baris.roleKey}
                          onChange={(e) =>
                            ubahBaris(baris.tempId, { roleKey: e.target.value })
                          }
                          disabled={isReadonly}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy font-medium focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                        >
                          <optgroup label="Pimpinan Inti (PI)">
                            {OPSI_PERAN_PANITIA.filter((o) =>
                              o.kategori.includes("PI"),
                            ).map((op) => (
                              <option key={op.key} value={op.key}>
                                {op.label}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Penanggung Jawab (PJ) & Pengawas">
                            {OPSI_PERAN_PANITIA.filter((o) =>
                              o.kategori.includes("PJ"),
                            ).map((op) => (
                              <option key={op.key} value={op.key}>
                                {op.label}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Anggota Panitia">
                            {OPSI_PERAN_PANITIA.filter((o) =>
                              o.kategori.includes("Anggota"),
                            ).map((op) => (
                              <option key={op.key} value={op.key}>
                                {op.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>
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
                              const sudahDiProker = panitiaStoIdSet.has(s.id);
                              const sudahDiBarisLain = selectedInOtherRows.has(s.id);
                              const isRowIni = String(s.id) === String(baris.stoId);
                              return (!sudahDiProker && !sudahDiBarisLain) || isRowIni;
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
                    {isDuplikatPeran && (
                      <p className="text-xs text-rose-600 mt-2.5 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Peran pimpinan inti & pengawas hanya boleh diisi oleh 1 orang.
                      </p>
                    )}
                    {isSekumSebagaiSekretarisInti && (
                      <p className="text-xs text-rose-600 mt-2.5 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Sekretaris Umum tidak dapat ditugaskan sebagai Sekretaris Inti.
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
                  disabled={stoBelumMasuk.length === 0 || isReadonly}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-surface text-navy text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-secondary" />
                  Tambah Baris Panitia
                </button>
                <span className="text-xs text-slate-muted">
                  Tersisa{" "}
                  <strong className="text-navy font-bold">
                    {Math.max(0, stoBelumMasuk.length - barisStruktur.length)}
                  </strong>{" "}
                  STO belum masuk
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
                  disabled={isPending || barisStruktur.length === 0 || isReadonly}
                  onClick={handleSubmitBanyakPanitia}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-50 shadow-md shadow-secondary/25 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Simpan Susunan Panitia
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
    </div>
  );
}
