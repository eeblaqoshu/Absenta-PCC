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
  OPSI_PERAN_PANITIA,
  isSekretarisUmum,
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
        teks: "Semua peran Kepanitiaan Inti (Ketua, Wakil, Sekretaris, Bendahara, dan Litbang Pengawas) sudah terisi lengkap tanpa duplikasi.",
      });
      return;
    }

    const currentUsedIds = new Set([
      ...panitiaStoIdSet,
      ...validRows.map((b) => Number(b.stoId)),
    ]);

    const isMatchKriteria = (
      sto: StoOption,
      kriteria?: "sekretaris" | "bendahara" | "litbang",
    ) => {
      if (!kriteria) return true;
      if (isSekretarisUmum(sto)) return false;
      const jab = (sto.jabatan || "").toLowerCase();
      const div = (sto.divisi || "").toLowerCase();
      return jab.includes(kriteria) || div.includes(kriteria);
    };

    const isSpecializedSto = (sto: StoOption) => {
      if (isSekretarisUmum(sto)) return true;
      const jab = (sto.jabatan || "").toLowerCase();
      const div = (sto.divisi || "").toLowerCase();
      return (
        jab.includes("sekretaris") ||
        div.includes("sekretaris") ||
        jab.includes("bendahara") ||
        div.includes("bendahara") ||
        jab.includes("litbang") ||
        div.includes("litbang")
      );
    };

    const pilihStoUntukPreset = (
      kriteria?: "sekretaris" | "bendahara" | "litbang",
    ): StoOption | null => {
      if (kriteria) {
        const match = availableStos.find(
          (s) =>
            !currentUsedIds.has(s.id) &&
            !isSekretarisUmum(s) &&
            isMatchKriteria(s, kriteria),
        );
        if (match) {
          currentUsedIds.add(match.id);
          return match;
        }
      } else {
        const generalMatch = availableStos.find(
          (s) =>
            !currentUsedIds.has(s.id) &&
            !isSekretarisUmum(s) &&
            !isSpecializedSto(s),
        );
        if (generalMatch) {
          currentUsedIds.add(generalMatch.id);
          return generalMatch;
        }
      }

      const fallbackMatch = availableStos.find(
        (s) => !currentUsedIds.has(s.id) && !isSekretarisUmum(s),
      );
      if (fallbackMatch) {
        currentUsedIds.add(fallbackMatch.id);
        return fallbackMatch;
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
        divisiPanitia: sto?.divisi || "Pengurus STO",
      };
    }

    const newRows: BarisFormPanitia[] = [];
    for (const preset of presetsToCreate) {
      const sto = pilihStoUntukPreset(preset.kriteria);
      newRows.push({
        tempId: Math.random().toString(36).substring(2, 9),
        stoId: sto ? String(sto.id) : "",
        roleKey: preset.roleKey,
        divisiPanitia: sto?.divisi || "Pengurus STO",
      });
    }

    setBarisStruktur([...updatedBaris, ...newRows]);
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
    for (const roleKey of peranIntiTunggal) {
      const duplikat = barisStruktur.filter((b) => b.roleKey === roleKey);
      if (duplikat.length > 1) {
        const labelPeran =
          OPSI_PERAN_PANITIA.find((o) => o.key === roleKey)?.label || roleKey;
        setPesan({
          tipe: "error",
          teks: `Terdapat ${duplikat.length} baris dengan peran "${labelPeran}". Peran pimpinan inti & pengawas hanya boleh diisi oleh 1 orang.`,
        });
        return;
      }
    }

    const barisSekretarisInti = barisStruktur.find(
      (b) => b.roleKey === "sekretaris_inti",
    );
    if (barisSekretarisInti && barisSekretarisInti.stoId) {
      const stoDipilih = availableStos.find(
        (s) => String(s.id) === String(barisSekretarisInti.stoId),
      );
      if (stoDipilih && isSekretarisUmum(stoDipilih)) {
        setPesan({
          tipe: "error",
          teks: `Pengurus "${stoDipilih.nama}" menjabat sebagai Sekretaris Umum dan tidak dapat ditugaskan sebagai Sekretaris Inti kepanitiaan.`,
        });
        return;
      }
    }

    const payload: BarisPanitiaInput[] = barisStruktur.map((b) => {
      const roleDef =
        OPSI_PERAN_PANITIA.find((r) => r.key === b.roleKey) ||
        OPSI_PERAN_PANITIA[0];
      return {
        stoId: Number(b.stoId),
        peran: roleDef.peran,
        divisiPanitia: roleDef.label,
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
      {/* Bagian Atas Fixed: Banner & Tombol Preset */}
      <div className="shrink-0 px-6 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-surface border border-[#E2E8F0]">
          <div className="text-xs text-navy">
            <span className="font-semibold">Tambahkan panitia sekaligus</span>{" "}
            tanpa perlu membuka-tutup form berulang kali.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={terapkanPresetInti}
              disabled={stoBelumMasuk.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-secondary/30 bg-white hover:bg-secondary/10 text-secondary text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Terapkan 7 peran: Ketua, Wakil, Sekretaris Inti & Pelaksana, Bendahara Inti & Pelaksana, serta Litbang Pengawas"
            >
              Preset Pimpinan Inti
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
                className={`p-3 rounded-2xl border transition-all ${
                  isDuplikat || isDuplikatPeran || isSekumSebagaiSekretarisInti
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
                    <select
                      value={baris.roleKey}
                      onChange={(e) =>
                        ubahBaris(baris.tempId, { roleKey: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                    >
                      {OPSI_PERAN_PANITIA.map((op) => (
                        <option key={op.key} value={op.key}>
                          {op.label}
                        </option>
                      ))}
                    </select>
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
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nama} ({s.nim})
                            {s.divisi ? ` - ${s.divisi}` : ""}
                          </option>
                        ))}
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

                {isDuplikatPeran && (
                  <p className="text-[10px] text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Peran pimpinan inti & pengawas hanya boleh diisi oleh 1 orang.
                  </p>
                )}
                {isSekumSebagaiSekretarisInti && (
                  <p className="text-[10px] text-rose-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Sekretaris Umum tidak dapat ditugaskan sebagai Sekretaris Inti.
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
    </div>
  );
}
