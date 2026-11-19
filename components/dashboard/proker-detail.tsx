// components/dashboard/proker-detail.tsx
"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import {
  tambahPanitiaAction,
  tambahBanyakPanitiaAction,
  imporCsvPanitiaAction,
  ubahPanitiaAction,
  hapusPanitiaAction,
  type BarisPanitiaInput,
  type CsvBarisPanitia,
} from "@/lib/actions/proker";
import {
  buatAgendaAction,
  ubahAgendaAction,
  hapusAgendaAction,
} from "@/lib/actions/agenda";
import {
  PeranPanitia,
  JenisAgenda,
  TargetPeserta,
  StatusPeriode,
} from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import { konfirmasiHapus } from "@/lib/swal";
import {
  SesiModal,
  type LokasiOption,
  type SesiItem,
} from "@/components/dashboard/sesi-modal";
import { AgendaStatusTabs } from "@/components/ui/agenda-status-tabs";
import { EmptyAgenda } from "@/components/ui/empty-agenda";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { PetaPilihLokasi } from "@/components/peta-pilih-lokasi";
import {
  hitungStatusAgenda,
  hitungStatusSesi,
  formatTanggalIndo,
  jamDariWaktuAgenda,
  keInputLokalWib,
  type StatusAgendaDihitung,
} from "@/lib/waktu";
import type { RekapKehadiranSesi } from "@/lib/kehadiran";
import {
  Users,
  Calendar,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Clock,
  MapPin,
  Trash2,
  Edit2,
  QrCode,
  Pencil,
  Upload,
  Download,
  FileSpreadsheet,
  Sparkles,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";

export const OPSI_PERAN_PANITIA = [
  {
    key: "ketua_pelaksana",
    label: "Ketua Pelaksana",
    peran: PeranPanitia.ketua,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "wakil_ketua_pelaksana",
    label: "Wakil Ketua Pelaksana",
    peran: PeranPanitia.ketua,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "sekretaris_inti",
    label: "Sekretaris Inti",
    peran: PeranPanitia.sekretaris,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "sekretaris_pelaksana",
    label: "Sekretaris Pelaksana",
    peran: PeranPanitia.sekretaris,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "bendahara_inti",
    label: "Bendahara Inti",
    peran: PeranPanitia.bendahara,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "bendahara_pelaksana",
    label: "Bendahara Pelaksana",
    peran: PeranPanitia.bendahara,
    kategori: "Pimpinan Inti (PI)",
  },
  {
    key: "litbang_pengawas",
    label: "Litbang Pengawas",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "pj_sie_acara",
    label: "Penanggung Jawab Sie Acara",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_acara",
    label: "Anggota Sie Acara",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_dekdok",
    label: "Penanggung Jawab Sie Dekdok",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_dekdok",
    label: "Anggota Sie Dekdok",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_humas",
    label: "Penanggung Jawab Sie Humas",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_humas",
    label: "Anggota Sie Humas",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_kreatif",
    label: "Penanggung Jawab Sie Kreatif",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_kreatif",
    label: "Anggota Sie Kreatif",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_perkap",
    label: "Penanggung Jawab Sie Perkap",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_perkap",
    label: "Anggota Sie Perkap",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_konsumsi",
    label: "Penanggung Jawab Sie Konsumsi",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_konsumsi",
    label: "Anggota Sie Konsumsi",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
  {
    key: "pj_sie_dekdokre",
    label: "Penanggung Jawab Sie Dekdokre",
    peran: PeranPanitia.pj_divisi,
    kategori: "Penanggung Jawab & Pengawas (PJ)",
  },
  {
    key: "anggota_sie_dekdokre",
    label: "Anggota Sie Dekdokre",
    peran: PeranPanitia.anggota,
    kategori: "Anggota Panitia",
  },
] as const;

interface PanitiaItem {
  id: number;
  peran: PeranPanitia;
  divisiPanitia: string | null;
  sto: {
    id: number;
    nama: string;
    nim: string;
    emailGoogle: string;
    jabatan: string | null;
    divisi: string | null;
  };
}

interface SesiRingkas {
  id: number;
  bukaAt: Date;
  tutupAt: Date;
}

interface AgendaItem {
  id: number;
  jenis: JenisAgenda;
  judul: string;
  urutan: number;
  tglPelaksanaan: Date;
  tglSelesai: Date | null;
  waktuPelaksanaan: Date;
  lokasiNama: string | null;
  lokasiId: number | null;
  lat: number | null;
  lng: number | null;
  radiusM: number | null;
  targetPeserta: TargetPeserta;
  statusDihitung: "akan_datang" | "sedang_berlangsung" | "selesai";
  sesi: SesiRingkas[];
}

interface StoOption {
  id: number;
  nama: string;
  nim: string;
  emailGoogle?: string;
  jabatan?: string | null;
  divisi: string | null;
}

// Denyut waktu untuk menghitung ulang status agenda (tiada render loop).
const DETAK_MS = 30_000;
function langgananDetak(cb: () => void) {
  const t = setInterval(cb, DETAK_MS);
  return () => clearInterval(t);
}
function cuplikanDetak() {
  return Math.floor(Date.now() / DETAK_MS);
}

/** Jam "HH:mm" (WIB) dari sebuah Date — dipakai kartu agenda. */
function keInputJam(date: Date | string): string {
  return keInputLokalWib(new Date(date)).split("T")[1] ?? "00:00";
}

/** Tanggal "YYYY-MM-DD" (WIB) dari sebuah Date. */
function keTanggalWib(date: Date | string): string {
  return keInputLokalWib(new Date(date)).split("T")[0] ?? "";
}

export function ProkerDetail({
  proker,
  availableStos,
  daftarLokasi,
  rekap,
}: {
  proker: {
    id: number;
    nama: string;
    deskripsi: string | null;
    periode: {
      id: number;
      nama: string;
      status: StatusPeriode;
    };
    kepanitiaan: PanitiaItem[];
    agenda: AgendaItem[];
  };
  availableStos: StoOption[];
  daftarLokasi: LokasiOption[];
  /** Rekap kehadiran per SESI (key = sesiId). */
  rekap: Record<number, RekapKehadiranSesi>;
}) {
  const [tabAktif, setTabAktif] = useState<"panitia" | "agenda">("panitia");
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  const isReadonly = proker.periode.status === StatusPeriode.selesai;

  // ─────────────────────────────────────────────
  // STATUS AGENDA (dihitung dari rentang tanggal + jam agenda)
  // ─────────────────────────────────────────────
  const [tabStatus, setTabStatus] =
    useState<StatusAgendaDihitung>("akan_datang");

  const detak = useSyncExternalStore(langgananDetak, cuplikanDetak, () => 0);
  const now = useMemo(
    () => (detak > 0 ? new Date(detak * DETAK_MS) : null),
    [detak],
  );

  const agendaBerstatus = useMemo(() => {
    return proker.agenda.map((a) => {
      const statusLive =
        now === null
          ? a.statusDihitung
          : hitungStatusAgenda(
              a.tglPelaksanaan,
              a.waktuPelaksanaan,
              a.tglSelesai,
              now,
            );
      return { ...a, statusLive };
    });
  }, [proker.agenda, now]);

  const kelompokAgenda = useMemo(
    () => ({
      sedang_berlangsung: agendaBerstatus.filter(
        (a) => a.statusLive === "sedang_berlangsung",
      ),
      akan_datang: agendaBerstatus.filter(
        (a) => a.statusLive === "akan_datang",
      ),
      selesai: agendaBerstatus.filter((a) => a.statusLive === "selesai"),
    }),
    [agendaBerstatus],
  );

  const tabEfektif: StatusAgendaDihitung =
    kelompokAgenda[tabStatus].length > 0
      ? tabStatus
      : ((
          [
            "sedang_berlangsung",
            "akan_datang",
            "selesai",
          ] as StatusAgendaDihitung[]
        ).find((k) => kelompokAgenda[k].length > 0) ?? tabStatus);

  const agendaTerlihat = kelompokAgenda[tabEfektif];

  // ─────────────────────────────────────────────
  // MODAL SESI PRESENSI & DAFTAR HADIR
  // ─────────────────────────────────────────────
  const [modalSesi, setModalSesi] = useState<{
    agenda: AgendaItem;
    sesiAwal: SesiItem | null;
  } | null>(null);

  // ─────────────────────────────────────────────
  // MODAL KELOLA PANITIA (STRUKTUR BANYAK & IMPOR CSV)
  // ─────────────────────────────────────────────
  const [modalPanitiaBuka, setModalPanitiaBuka] = useState(false);
  const [tabModalPanitia, setTabModalPanitia] = useState<"struktur" | "csv">(
    "struktur",
  );

  interface BarisFormPanitia {
    tempId: string;
    stoId: string;
    roleKey: string;
    divisiPanitia: string;
  }
  const [barisStruktur, setBarisStruktur] = useState<BarisFormPanitia[]>([]);

  // CSV Import state
  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState<
    Array<{
      nim: string;
      stoNama?: string;
      peran: string;
      divisi: string;
      valid: boolean;
      pesanError?: string;
    }>
  >([]);
  const [csvRawList, setCsvRawList] = useState<CsvBarisPanitia[]>([]);

  // Modal Edit Panitia Tunggal (via tombol edit baris tabel)
  const [modalEditPanitiaBuka, setModalEditPanitiaBuka] = useState(false);
  const [panitiaDiedit, setPanitiaDiedit] = useState<PanitiaItem | null>(null);
  const [selectedRoleKeyEdit, setSelectedRoleKeyEdit] =
    useState<string>("ketua_pelaksana");
  const [divisiPanitiaEdit, setDivisiPanitiaEdit] = useState<string>("");

  // ─────────────────────────────────────────────
  // MODAL AGENDA STATE
  // ─────────────────────────────────────────────
  const [modalAgendaBuka, setModalAgendaBuka] = useState(false);
  const [modalEditAgendaBuka, setModalEditAgendaBuka] = useState(false);
  const [agendaDiedit, setAgendaDiedit] = useState<AgendaItem | null>(null);

  const [judulAgenda, setJudulAgenda] = useState("");
  const [jenisAgenda, setJenisAgenda] = useState<JenisAgenda>(
    JenisAgenda.rapat_besar,
  );
  const [urutanAgenda, setUrutanAgenda] = useState<number>(1);
  const [tglAgenda, setTglAgenda] = useState("");
  const [tglSelesaiAgenda, setTglSelesaiAgenda] = useState("");
  const [waktuAgenda, setWaktuAgenda] = useState("15:00");
  const [lokasiAgenda, setLokasiAgenda] = useState("");
  const [lokasiAgendaId, setLokasiAgendaId] = useState("");
  const [radiusAgenda, setRadiusAgenda] = useState<number>(500);
  const [titikAgenda, setTitikAgenda] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [targetPeserta, setTargetPeserta] = useState<TargetPeserta>(
    TargetPeserta.semua_panitia,
  );

  const titikAgendaAktif = titikAgenda ?? { lat: -7.0513, lng: 110.4337 };

  // ─────────────────────────────────────────────
  // FILTER STO YANG BELUM TERDAFTAR DI PROKER
  // ─────────────────────────────────────────────
  const panitiaStoIdSet = new Set(proker.kepanitiaan.map((k) => k.sto.id));
  const stoBelumMasuk = availableStos.filter((s) => !panitiaStoIdSet.has(s.id));

  // Daftar opsi divisi unik dari data pengurus STO
  const daftarDivisiSto = useMemo(() => {
    const set = new Set<string>();
    availableStos.forEach((s) => {
      if (s.divisi) set.add(s.divisi);
    });
    if (set.size === 0) {
      set.add("Divisi Workshop");
      set.add("Departemen Software");
    }
    return Array.from(set).sort();
  }, [availableStos]);

  // Helper validator: Sekretaris Umum tidak boleh dimasukkan ke dalam preset / sekretaris inti
  const isSekretarisUmum = (sto: StoOption | null | undefined): boolean => {
    if (!sto) return false;
    const jab = (sto.jabatan || "").toLowerCase();
    const div = (sto.divisi || "").toLowerCase();
    return (
      jab.includes("sekretaris umum") ||
      div.includes("sekretaris umum") ||
      jab.includes("sekum") ||
      div.includes("sekum")
    );
  };

  // Handler Buka Modal Panitia (Tab Struktur atau CSV)
  const bukaModalKelolaPanitia = (tab: "struktur" | "csv" = "struktur") => {
    setTabModalPanitia(tab);
    setPesan(null);
    if (tab === "struktur" && barisStruktur.length === 0) {
      const usedIds = new Set(proker.kepanitiaan.map((k) => k.sto.id));
      const firstAvailable = availableStos.find(
        (s) => !usedIds.has(s.id) && !isSekretarisUmum(s),
      );
      setBarisStruktur([
        {
          tempId: Math.random().toString(36).substring(2, 9),
          stoId: firstAvailable ? String(firstAvailable.id) : "",
          roleKey: "ketua_pelaksana",
          divisiPanitia: firstAvailable?.divisi || "Pengurus Inti",
        },
      ]);
    }
    setModalPanitiaBuka(true);
  };

  // Helper Baris Form Panitia
  const tambahBaris = (preset?: Partial<BarisFormPanitia>) => {
    const usedIds = new Set([
      ...panitiaStoIdSet,
      ...barisStruktur.map((b) => Number(b.stoId)).filter(Boolean),
    ]);
    const firstAvailable = availableStos.find(
      (s) => !usedIds.has(s.id) && !isSekretarisUmum(s),
    );
    
    // Tentukan default roleKey: jangan menduplikasi peran pimpinan inti jika sudah ada di form
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
    // 1. Kumpulkan roleKey pimpinan inti yang sudah terisi di form (dengan STO yang dipilih)
    const validRows = barisStruktur.filter((b) => Boolean(b.stoId));
    const existingRolesInForm = new Set(validRows.map((b) => b.roleKey));

    // 2. Kumpulkan roleKey pimpinan inti yang sudah ada di database kepanitiaan proker ini
    const existingRolesInKepanitiaan = new Set<string>();
    for (const k of proker.kepanitiaan) {
      const match = OPSI_PERAN_PANITIA.find(
        (o) =>
          o.label.toLowerCase() === (k.divisiPanitia || "").toLowerCase() ||
          (o.key === "ketua_pelaksana" && k.peran === PeranPanitia.ketua) ||
          (o.key === "wakil_ketua_pelaksana" &&
            (k.divisiPanitia || "").toLowerCase().includes("wakil")) ||
          (o.key === "sekretaris_inti" &&
            (k.divisiPanitia || "").toLowerCase().includes("sekretaris inti")) ||
          (o.key === "sekretaris_pelaksana" &&
            (k.peran === PeranPanitia.sekretaris ||
              (k.divisiPanitia || "").toLowerCase().includes("sekretaris pelaksana"))) ||
          (o.key === "bendahara_inti" &&
            (k.divisiPanitia || "").toLowerCase().includes("bendahara inti")) ||
          (o.key === "bendahara_pelaksana" &&
            (k.peran === PeranPanitia.bendahara ||
              (k.divisiPanitia || "").toLowerCase().includes("bendahara pelaksana"))) ||
          (o.key === "litbang_pengawas" &&
            (k.divisiPanitia || "").toLowerCase().includes("litbang")),
      );
      if (match) {
        existingRolesInKepanitiaan.add(match.key);
      }
    }

    // 3. Tujuh peran kepanitiaan inti & pengawas:
    //    1. Ketua Pelaksana
    //    2. Wakil Ketua Pelaksana
    //    3. Sekretaris Inti (dari STO kepengurusan Sekretaris)
    //    4. Sekretaris Pelaksana
    //    5. Bendahara Inti (dari STO kepengurusan Bendahara)
    //    6. Bendahara Pelaksana
    //    7. Litbang Pengawas (dari STO kepengurusan Litbang)
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

    // Filter hanya preset yang BELUM ADA di form maupun di kepanitiaan tersimpan
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

    // 4. Set pelacak STO yang sudah digunakan
    const currentUsedIds = new Set([
      ...panitiaStoIdSet,
      ...validRows.map((b) => Number(b.stoId)),
    ]);

    // Helper cek kecocokan kriteria kepengurusan STO
    const isMatchKriteria = (
      sto: StoOption,
      kriteria?: "sekretaris" | "bendahara" | "litbang",
    ) => {
      if (!kriteria) return true;
      // Jangan pernah pilih Sekretaris Umum untuk preset (termasuk peran sekretaris inti)
      if (isSekretarisUmum(sto)) return false;
      const jab = (sto.jabatan || "").toLowerCase();
      const div = (sto.divisi || "").toLowerCase();
      return jab.includes(kriteria) || div.includes(kriteria);
    };

    // Helper cek apakah STO punya kepengurusan khusus (Sekretaris, Bendahara, Litbang)
    const isSpecializedSto = (sto: StoOption) => {
      if (isSekretarisUmum(sto)) return true; // Anggap Sekum khusus agar tidak terpilih ke peran umum
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

    // Fungsi pemilih STO cerdas berdasarkan peran
    const pilihStoUntukPreset = (
      kriteria?: "sekretaris" | "bendahara" | "litbang",
    ): StoOption | null => {
      if (kriteria) {
        // Cari STO yang belum terpakai, bukan Sekum, dan kepengurusannya sesuai kriteria
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
        // Untuk peran umum (Ketua, Wakil, Sekpel, Benpel), dahulukan STO yang bukan Sekum dan bukan kepengurusan khusus
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

      // Fallback jika tidak ditemukan yang spesifik/umum: pilih STO apa saja yang masih tersisa (tetap kecualikan Sekum)
      const fallbackMatch = availableStos.find(
        (s) => !currentUsedIds.has(s.id) && !isSekretarisUmum(s),
      );
      if (fallbackMatch) {
        currentUsedIds.add(fallbackMatch.id);
        return fallbackMatch;
      }

      return null;
    };

    // 5. Cek jika ada baris kosong di form (misal baris pertama yang belum dipilih pengurusnya)
    const emptyRowIndices = barisStruktur
      .map((b, idx) => (!b.stoId ? idx : -1))
      .filter((idx) => idx !== -1);

    const updatedBaris = [...barisStruktur];
    const presetsToCreate = [...presetsNeeded];

    // Isi baris yang masih kosong terlebih dahulu
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

    // Buat baris baru hanya untuk sisa preset yang belum terpenuhi
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

        // Saat STO dipilih, otomatis isi divisiPanitia dengan divisi STO pengurus tersebut
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

    // Validasi tidak boleh ada peran pimpinan inti & pengawas yang duplikat
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

    // Validasi Sekretaris Umum tidak boleh ditugaskan sebagai Sekretaris Inti
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
        setModalPanitiaBuka(false);
        setBarisStruktur([]);
      }
    });
  };

  // Unduh Template CSV Kepanitiaan
  const unduhTemplateCsv = () => {
    const s1 = availableStos[0];
    const s2 = availableStos[1];
    const s3 = availableStos[2];
    const s4 = availableStos[3];

    const csvContent = [
      "NIM,Peran,Divisi_Panitia",
      `${s1?.nim || "223141001"},ketua,${s1?.divisi || "Pengurus Inti"}`,
      `${s2?.nim || "223141002"},sekretaris,${s2?.divisi || "Pengurus Inti"}`,
      `${s3?.nim || "223141003"},bendahara,${s3?.divisi || "Pengurus Inti"}`,
      `${s4?.nim || "223141004"},pj_divisi,${s4?.divisi || "Divisi Workshop"}`,
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = proker.nama.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    link.setAttribute("download", `template_panitia_${safeName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handler Unggah & Parse File CSV
  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setPesan(null);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        setPesan({
          tipe: "error",
          teks: "File CSV kosong atau hanya berisi baris header.",
        });
        setCsvPreview([]);
        setCsvRawList([]);
        return;
      }

      const headerLine = lines[0].toLowerCase();
      const delimiter = headerLine.includes(";") ? ";" : ",";
      const headers = headerLine
        .split(delimiter)
        .map((h) => h.trim().replace(/^["']|["']$/g, ""));

      const nimIdx = headers.findIndex((h) => h.includes("nim"));
      const peranIdx = headers.findIndex(
        (h) =>
          h.includes("peran") || h.includes("role") || h.includes("posisi"),
      );
      const divisiIdx = headers.findIndex(
        (h) =>
          h.includes("divisi") ||
          h.includes("sie") ||
          h.includes("bidang") ||
          h.includes("seksi") ||
          h.includes("jabatan"),
      );

      const effNim = nimIdx >= 0 ? nimIdx : 0;
      const effPeran = peranIdx >= 0 ? peranIdx : 1;
      const effDivisi = divisiIdx >= 0 ? divisiIdx : 2;

      const nimMap = new Map(availableStos.map((s) => [s.nim.trim(), s]));
      const existingPanitiaIds = new Set(
        proker.kepanitiaan.map((k) => k.sto.id),
      );

      const parsed: typeof csvPreview = [];
      const raw: CsvBarisPanitia[] = [];
      const seenNims = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const cols = row
          .split(delimiter)
          .map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const nim = cols[effNim] || "";
        const peran = cols[effPeran] || "";
        const divisi = cols[effDivisi] || "";

        if (!nim) continue;

        const matchedSto = nimMap.get(nim);
        let valid = true;
        let pesanError = "";

        if (!matchedSto) {
          valid = false;
          pesanError = "NIM tidak terdaftar di periode ini";
        } else if (existingPanitiaIds.has(matchedSto.id)) {
          valid = false;
          pesanError = `${matchedSto.nama} sudah terdaftar`;
        } else if (seenNims.has(nim)) {
          valid = false;
          pesanError = "Duplikasi NIM di dalam file";
        }

        seenNims.add(nim);

        const effDivisiVal = divisi || matchedSto?.divisi || "Divisi Workshop";

        parsed.push({
          nim,
          stoNama: matchedSto?.nama,
          peran: peran || "anggota",
          divisi: effDivisiVal,
          valid,
          pesanError,
        });

        raw.push({
          nim,
          peran,
          divisiPanitia: effDivisiVal,
        });
      }

      setCsvPreview(parsed);
      setCsvRawList(raw);
    } catch {
      setPesan({
        tipe: "error",
        teks: "Gagal membaca file CSV. Pastikan format file teks valid.",
      });
    }
  };

  const handleProsesImporCsv = () => {
    if (csvRawList.length === 0) return;
    const validCount = csvPreview.filter((p) => p.valid).length;
    if (validCount === 0) {
      setPesan({
        tipe: "error",
        teks: "Tidak ada baris panitia valid dalam file CSV untuk diimpor.",
      });
      return;
    }

    startTransition(async () => {
      const res = await imporCsvPanitiaAction(proker.id, csvRawList);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({
          tipe: "sukses",
          teks:
            res.pesan ||
            `${res.totalBerhasil} panitia berhasil diimpor dari file CSV.`,
        });
        setModalPanitiaBuka(false);
        setCsvFileName("");
        setCsvPreview([]);
        setCsvRawList([]);
      }
    });
  };

  // Handler Edit Panitia Tunggal
  const handleOpenEditPanitia = (item: PanitiaItem) => {
    setPanitiaDiedit(item);
    const byLabelOrPeran =
      OPSI_PERAN_PANITIA.find(
        (o) => o.label.toLowerCase() === item.divisiPanitia?.toLowerCase(),
      ) || OPSI_PERAN_PANITIA.find((o) => o.peran === item.peran);
    setSelectedRoleKeyEdit(
      byLabelOrPeran ? byLabelOrPeran.key : OPSI_PERAN_PANITIA[0].key,
    );
    setDivisiPanitiaEdit(item.sto.divisi || "Umum");
    setModalEditPanitiaBuka(true);
  };

  const handleSubmitEditPanitia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!panitiaDiedit) return;
    setPesan(null);

    const roleDef =
      OPSI_PERAN_PANITIA.find((r) => r.key === selectedRoleKeyEdit) ||
      OPSI_PERAN_PANITIA[0];

    const formData = new FormData();
    formData.append("peran", roleDef.peran);
    formData.append("divisiPanitia", roleDef.label);

    startTransition(async () => {
      const res = await ubahPanitiaAction(panitiaDiedit.id, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalEditPanitiaBuka(false);
        setPanitiaDiedit(null);
      }
    });
  };

  const handleHapusPanitia = async (kepanitiaanId: number, namaSto: string) => {
    const setuju = await konfirmasiHapus({
      judul: "Hapus dari Kepanitiaan?",
      pesan: `Anda yakin ingin menghapus "${namaSto}" dari kepanitiaan proker ini?`,
      tombolHapus: "Ya, Hapus Panitia",
    });
    if (!setuju) return;

    startTransition(async () => {
      const res = await hapusPanitiaAction(kepanitiaanId);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
      }
    });
  };

  // Handler Agenda
  const resetFormAgenda = () => {
    setJudulAgenda("");
    setJenisAgenda(JenisAgenda.rapat_besar);
    setUrutanAgenda(proker.agenda.length + 1);
    setTglAgenda("");
    setTglSelesaiAgenda("");
    setWaktuAgenda("15:00");
    setLokasiAgenda("");
    setLokasiAgendaId("");
    setRadiusAgenda(500);
    setTitikAgenda(null);
    setTargetPeserta(TargetPeserta.semua_panitia);
    setAgendaDiedit(null);
  };

  /** Pilih master lokasi -> isi nama, radius, dan titik peta. */
  const pilihLokasiMaster = (idMentah: string) => {
    setLokasiAgendaId(idMentah);
    if (!idMentah) return;
    const lok = daftarLokasi.find((l) => l.id === Number(idMentah));
    if (!lok) return;
    setLokasiAgenda(lok.nama);
    setRadiusAgenda(lok.radiusM);
    setTitikAgenda({ lat: lok.lat, lng: lok.lng });
  };

  const handleSubmitTambahAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    setPesan(null);

    const formData = new FormData();
    formData.append("prokerId", proker.id.toString());
    formData.append("judul", judulAgenda);
    formData.append("jenis", jenisAgenda);
    formData.append("urutan", urutanAgenda.toString());
    formData.append("tglPelaksanaan", tglAgenda);
    formData.append("tglSelesai", tglSelesaiAgenda);
    formData.append("waktuPelaksanaan", waktuAgenda);
    formData.append("lokasiNama", lokasiAgenda);
    formData.append("lokasiId", lokasiAgendaId);
    if (titikAgenda) {
      formData.append("lat", String(titikAgenda.lat));
      formData.append("lng", String(titikAgenda.lng));
      formData.append("radiusM", String(radiusAgenda));
    }
    formData.append("targetPeserta", targetPeserta);

    startTransition(async () => {
      const res = await buatAgendaAction(null, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalAgendaBuka(false);
        resetFormAgenda();
      }
    });
  };

  const handleOpenEditAgenda = (item: AgendaItem) => {
    setAgendaDiedit(item);
    setJudulAgenda(item.judul);
    setJenisAgenda(item.jenis);
    setUrutanAgenda(item.urutan);
    setTglAgenda(keTanggalWib(item.tglPelaksanaan));
    setTglSelesaiAgenda(item.tglSelesai ? keTanggalWib(item.tglSelesai) : "");
    setWaktuAgenda(jamDariWaktuAgenda(item.waktuPelaksanaan));
    setLokasiAgenda(item.lokasiNama || "");
    setLokasiAgendaId(item.lokasiId ? String(item.lokasiId) : "");
    setRadiusAgenda(item.radiusM ?? 500);
    setTitikAgenda(
      item.lat !== null && item.lng !== null
        ? { lat: item.lat, lng: item.lng }
        : null,
    );
    setTargetPeserta(item.targetPeserta);
    setModalEditAgendaBuka(true);
  };

  const handleSubmitEditAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaDiedit) return;
    setPesan(null);

    const formData = new FormData();
    formData.append("judul", judulAgenda);
    formData.append("jenis", jenisAgenda);
    formData.append("urutan", urutanAgenda.toString());
    formData.append("tglPelaksanaan", tglAgenda);
    formData.append("tglSelesai", tglSelesaiAgenda);
    formData.append("waktuPelaksanaan", waktuAgenda);
    formData.append("lokasiNama", lokasiAgenda);
    formData.append("lokasiId", lokasiAgendaId);
    if (titikAgenda) {
      formData.append("lat", String(titikAgenda.lat));
      formData.append("lng", String(titikAgenda.lng));
      formData.append("radiusM", String(radiusAgenda));
    }
    formData.append("targetPeserta", targetPeserta);

    startTransition(async () => {
      const res = await ubahAgendaAction(agendaDiedit.id, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalEditAgendaBuka(false);
        resetFormAgenda();
      }
    });
  };

  const handleHapusAgenda = async (agendaId: number, judul: string) => {
    const setuju = await konfirmasiHapus({
      judul: "Hapus Agenda Kegiatan?",
      pesan: `Anda yakin ingin menghapus agenda "${judul}"? Sesi presensi dan rekap terkait akan terhapus.`,
      tombolHapus: "Ya, Hapus Agenda",
    });
    if (!setuju) return;

    startTransition(async () => {
      const res = await hapusAgendaAction(agendaId);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
      }
    });
  };

  // Label Helper
  const getPeranBadge = (peran: PeranPanitia, roleName?: string | null) => {
    const isNamaDivisi =
      roleName &&
      (roleName.toLowerCase().startsWith("divisi") ||
        roleName.toLowerCase().startsWith("departemen") ||
        roleName.toLowerCase().includes("workshop") ||
        roleName.toLowerCase().includes("software"));

    const label =
      roleName && !isNamaDivisi
        ? roleName
        : peran === PeranPanitia.ketua
          ? "Ketua Pelaksana"
          : peran === PeranPanitia.sekretaris
            ? "Sekretaris Pelaksana"
            : peran === PeranPanitia.bendahara
              ? "Bendahara Pelaksana"
              : peran === PeranPanitia.pj_divisi
                ? "PJ Divisi"
                : "Anggota";
    const l = label.toLowerCase();
    if (l.includes("ketua")) {
      return { label, bg: "bg-primary text-white border-primary shadow-xs" };
    }
    if (l.includes("sekretaris")) {
      return {
        label,
        bg: "bg-secondary/15 text-secondary border-secondary/30",
      };
    }
    if (l.includes("bendahara")) {
      return {
        label,
        bg: "bg-highlight/20 text-[#B45309] border-highlight/40",
      };
    }
    if (
      l.includes("penanggung jawab") ||
      l.includes("pj") ||
      l.includes("koordinator")
    ) {
      return { label, bg: "bg-accent/20 text-primary border-accent/40" };
    }
    return { label, bg: "bg-surface text-slate-muted border-[#CBD5E1]" };
  };

  const getJenisAgendaBadge = (jenis: JenisAgenda) => {
    switch (jenis) {
      case JenisAgenda.rapat_pj:
        return {
          label: "Rapat PJ & PI",
          color: "text-primary bg-primary/10 border border-primary/20",
        };
      case JenisAgenda.rapat_besar:
        return {
          label: "Rapat Besar",
          color: "text-secondary bg-secondary/10 border border-secondary/20",
        };
      case JenisAgenda.rapat_koordinasi:
        return {
          label: "Rapat Koordinasi",
          color: "text-primary bg-accent/20 border border-accent/30",
        };
      case JenisAgenda.hari_h:
        return {
          label: "Hari H Pelaksanaan",
          color: "text-[#B45309] bg-highlight/20 border border-highlight/30",
        };
    }
  };

  const getTargetPesertaLabel = (target: TargetPeserta) => {
    switch (target) {
      case TargetPeserta.hanya_pj_pi:
        return "Khusus PJ & PI";
      case TargetPeserta.semua_panitia:
        return "Semua Panitia Proker";
      case TargetPeserta.semua_panitia_sto:
        return "Semua STO Satu Periode";
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          href="/dashboard/proker"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-navy mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-secondary" />
          Kembali ke Daftar Proker
        </Link>

        <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  !isReadonly
                    ? "bg-accent/20 text-primary border border-accent/30"
                    : "bg-[#E2E8F0] text-slate-muted"
                }`}
              >
                {!isReadonly ? "Periode Aktif" : "Periode Selesai (Read-Only)"}
              </span>
              <span className="text-xs text-slate-muted">
                • {proker.periode.nama}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-primary">
              {proker.nama}
            </h2>
            <p className="text-xs text-slate-muted mt-1 max-w-2xl">
              {proker.deskripsi ||
                "Tidak ada deskripsi rinci untuk proker ini."}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-navy border-t sm:border-t-0 sm:border-l border-[#E2E8F0] pt-3 sm:pt-0 sm:pl-6">
            <div>
              <div className="text-lg font-bold text-primary">
                {proker.kepanitiaan.length}
              </div>
              <div className="text-[11px] text-slate-muted">Total Panitia</div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">
                {proker.agenda.length}
              </div>
              <div className="text-[11px] text-slate-muted">
                Agenda Kegiatan
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
      {pesan && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
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
            className="text-slate-muted hover:text-navy"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTabAktif("panitia")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              tabAktif === "panitia"
                ? "border-secondary text-secondary"
                : "border-transparent text-slate-muted hover:text-navy"
            }`}
          >
            <Users className="w-4 h-4" />
            Susunan Kepanitiaan ({proker.kepanitiaan.length})
          </button>
          <button
            onClick={() => setTabAktif("agenda")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
              tabAktif === "agenda"
                ? "border-secondary text-secondary"
                : "border-transparent text-slate-muted hover:text-navy"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Agenda Kegiatan ({proker.agenda.length})
          </button>
        </div>

        {!isReadonly && (
          <div>
            {tabAktif === "panitia" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => bukaModalKelolaPanitia("csv")}
                  disabled={stoBelumMasuk.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-secondary/30 bg-surface text-secondary hover:bg-secondary/10 disabled:opacity-50 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  title="Impor susunan kepanitiaan melalui file CSV"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Impor CSV
                </button>
                <button
                  type="button"
                  onClick={() => bukaModalKelolaPanitia("struktur")}
                  disabled={stoBelumMasuk.length === 0}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Susun Panitia
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  resetFormAgenda();
                  setModalAgendaBuka(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Agenda
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
          TAB 1: KEPANITIAAN CONTENT
      ───────────────────────────────────────────── */}
      {tabAktif === "panitia" && (
        <div className="space-y-4">
          {proker.kepanitiaan.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white">
              <Users className="w-10 h-10 text-slate-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy">
                Belum ada susunan panitia untuk proker ini
              </p>
              <p className="text-xs text-slate-muted mt-1">
                Tambahkan pengurus STO ke dalam kepanitiaan melalui tombol
                &quot;Tambah Panitia&quot;.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
              <div
                className="overflow-x-auto scrollbar-none"
                data-lenis-prevent
              >
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-6 py-3.5">Nama & NIM Pengurus</th>
                      <th className="px-6 py-3.5">Peran Kepanitiaan</th>
                      <th className="px-6 py-3.5">Divisi / Departemen</th>
                      {!isReadonly && (
                        <th className="px-6 py-3.5 text-right">Aksi</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {proker.kepanitiaan.map((item) => {
                      const badge = getPeranBadge(
                        item.peran,
                        item.divisiPanitia,
                      );
                      const divisiLabel = item.sto.divisi || "Umum";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-surface/70 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                {item.sto.nama.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-navy">
                                  {item.sto.nama}
                                </div>
                                <div className="text-[11px] text-slate-muted">
                                  {item.sto.nim} • {item.sto.emailGoogle}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-navy">
                            {divisiLabel}
                          </td>
                          {!isReadonly && (
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEditPanitia(item)}
                                  title="Ubah Peran Panitia"
                                  className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleHapusPanitia(item.id, item.sto.nama)
                                  }
                                  disabled={isPending}
                                  title="Hapus dari Panitia"
                                  className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          TAB 2: AGENDA KEGIATAN CONTENT
      ───────────────────────────────────────────── */}
      {tabAktif === "agenda" && (
        <div className="space-y-4">
          <AgendaStatusTabs
            items={[
              {
                id: "akan_datang",
                label: "Akan Datang",
                count: kelompokAgenda.akan_datang.length,
              },
              {
                id: "sedang_berlangsung",
                label: "Sedang Berlangsung",
                count: kelompokAgenda.sedang_berlangsung.length,
              },
              {
                id: "selesai",
                label: "Selesai",
                count: kelompokAgenda.selesai.length,
              },
            ]}
            value={tabEfektif}
            onChange={setTabStatus}
            layoutId="adsek-agenda-tabs"
          />

          {proker.agenda.length === 0 ? (
            <EmptyAgenda
              judul="Belum ada agenda untuk proker ini"
              deskripsi='Klik tombol "Tambah Agenda" untuk membuat jadwal rapat atau hari H kegiatan.'
            />
          ) : agendaTerlihat.length === 0 ? (
            <EmptyAgenda />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={tabEfektif}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {agendaTerlihat.map((item) => {
                  const targetText = getTargetPesertaLabel(item.targetPeserta);
                  const sedangBerjalan =
                    item.statusLive === "sedang_berlangsung";
                  const sudahSelesai = item.statusLive === "selesai";
                  const tglStr = formatTanggalIndo(
                    new Date(item.tglPelaksanaan),
                  );
                  const tglSelesaiStr = item.tglSelesai
                    ? formatTanggalIndo(new Date(item.tglSelesai))
                    : null;
                  const jamAgendaWib = jamDariWaktuAgenda(
                    item.waktuPelaksanaan,
                  );
                  const adaTitik = item.lat !== null && item.lng !== null;
                  const jenisBadge = getJenisAgendaBadge(item.jenis);

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:border-secondary transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${jenisBadge.color}`}
                            >
                              {jenisBadge.label}
                            </span>
                            <span className="text-xs text-slate-muted">
                              • {targetText}
                            </span>
                            {sedangBerjalan ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Sedang berlangsung
                              </span>
                            ) : sudahSelesai ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E2E8F0] text-slate-muted">
                                Selesai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-highlight/15 text-[#8a6500]">
                                Belum mulai
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-primary tracking-tight">
                            {item.judul}
                          </h4>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-muted">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-secondary" />
                              <span>
                                {tglStr}
                                {tglSelesaiStr && ` – ${tglSelesaiStr}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-secondary" />
                              <span>{jamAgendaWib} WIB</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-accent" />
                              <span>
                                {item.lokasiNama ?? "Lokasi belum diisi"}
                                {item.radiusM
                                  ? ` • radius ${item.radiusM} m`
                                  : ""}
                              </span>
                            </div>
                          </div>

                          {!adaTitik && (
                            <p className="text-[11px] text-amber-600 inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Titik presensi belum diatur — atur di tombol edit
                              agenda sebelum membuat sesi.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 sm:self-start">
                          {!isReadonly && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditAgenda(item)}
                                title="Edit Agenda"
                                className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleHapusAgenda(item.id, item.judul)
                                }
                                disabled={isPending}
                                title="Hapus Agenda"
                                className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          {/* Aksi agenda: "Tambah Sesi" hanya saat sedang berlangsung.
                              Agenda akan datang tanpa sesi tidak menampilkan aksi apa pun. */}
                          {!isReadonly && sedangBerjalan && (
                            <button
                              onClick={() =>
                                setModalSesi({ agenda: item, sesiAwal: null })
                              }
                              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-secondary hover:bg-primary text-white font-semibold text-xs shadow-md shadow-secondary/25 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Tambah Sesi
                            </button>
                          )}
                          {isReadonly && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-[#E2E8F0] text-slate-muted text-xs font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Periode selesai
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Sesi presensi: daftar hadir & QR muncul setelah sesi dibuat. */}
                      <div className="pt-3 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-secondary font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-accent" />
                            {item.sesi.length > 0
                              ? `${item.sesi.length} Sesi Presensi`
                              : "Belum ada sesi presensi"}
                          </span>
                        </div>

                        {item.sesi.length > 0 && (
                          <div className="rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] overflow-hidden bg-surface/30">
                            {item.sesi.map((sesi) => {
                              const statusSesi = hitungStatusSesi(
                                new Date(sesi.bukaAt),
                                new Date(sesi.tutupAt),
                                now ?? undefined,
                              );
                              const rekapSesi = rekap[sesi.id];
                              return (
                                <div
                                  key={sesi.id}
                                  className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 bg-surface/50 hover:bg-surface transition-colors"
                                >
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-muted">
                                    <span className="inline-flex items-center gap-1 font-semibold text-navy">
                                      <QrCode className="w-3.5 h-3.5 text-secondary" />
                                      {keInputJam(sesi.bukaAt)}–
                                      {keInputJam(sesi.tutupAt)} WIB
                                    </span>
                                    <span>
                                      {statusSesi === "berjalan"
                                        ? "Sedang dibuka"
                                        : statusSesi === "belum_dibuka"
                                          ? "Belum dibuka"
                                          : "Sudah ditutup"}
                                    </span>
                                    {rekapSesi && (
                                      <span>
                                        Hadir{" "}
                                        {rekapSesi.ringkasan.hadir +
                                          rekapSesi.ringkasan.terlambat}
                                        /{rekapSesi.ringkasan.total}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {statusSesi === "berjalan" && (
                                      <Link
                                        href={`/dashboard/presensi/${sesi.id}`}
                                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-secondary hover:bg-primary text-white font-semibold text-xs shadow-md shadow-secondary/25 transition-all"
                                      >
                                        <QrCode className="w-3.5 h-3.5" />
                                        Layar QR
                                      </Link>
                                    )}
                                    <Link
                                      href={`/dashboard/presensi/${sesi.id}`}
                                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white border border-[#E2E8F0] hover:bg-surface text-navy font-semibold text-xs shadow-xs transition-all"
                                    >
                                      <Users className="w-3.5 h-3.5 text-secondary" />
                                      Daftar Hadir
                                    </Link>
                                    {!isReadonly && !sudahSelesai && (
                                      <button
                                        onClick={() =>
                                          setModalSesi({
                                            agenda: item,
                                            sesiAwal: {
                                              id: sesi.id,
                                              bukaAt: new Date(sesi.bukaAt),
                                              tutupAt: new Date(sesi.tutupAt),
                                            },
                                          })
                                        }
                                        title="Ubah sesi"
                                        className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
          MODAL KELOLA PANITIA (BATCH STRUKTUR & IMPOR CSV)
      ───────────────────────────────────────────── */}
      {modalPanitiaBuka && (
        <Modal
          onClose={() => setModalPanitiaBuka(false)}
          ariaLabel="Kelola susunan kepanitiaan proker"
          size="4xl"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <ModalHeader
              title="Kelola Susunan Kepanitiaan"
              description={`Atur panitia untuk "${proker.nama}" sekaligus atau gunakan berkas CSV.`}
              icon={Users}
              onClose={() => setModalPanitiaBuka(false)}
            />

            {/* Navigasi Tab dalam Modal */}
            <div className="px-6 pt-2 pb-0 border-b border-[#E2E8F0] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTabModalPanitia("struktur")}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  tabModalPanitia === "struktur"
                    ? "border-secondary text-secondary"
                    : "border-transparent text-slate-muted hover:text-navy"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Susun Struktur Langsung
                {barisStruktur.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary/15 text-secondary">
                    {barisStruktur.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTabModalPanitia("csv")}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  tabModalPanitia === "csv"
                    ? "border-secondary text-secondary"
                    : "border-transparent text-slate-muted hover:text-navy"
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Impor dari File CSV
                {csvPreview.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-secondary/15 text-secondary">
                    {csvPreview.length}
                  </span>
                )}
              </button>
            </div>

            <ModalBody>
              {tabModalPanitia === "struktur" ? (
                <div className="space-y-4">
                  {/* Top Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-surface border border-[#E2E8F0]">
                    <div className="text-xs text-navy">
                      <span className="font-semibold">
                        Tambahkan panitia sekaligus
                      </span>{" "}
                      tanpa perlu membuka-tutup form berulang kali.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={terapkanPresetInti}
                        disabled={stoBelumMasuk.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-secondary/30 bg-white hover:bg-secondary/10 text-secondary text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                        title="Terapkan 7 peran: Ketua, Wakil, Sekretaris Inti & Pelaksana, Bendahara Inti & Pelaksana, serta Litbang Pengawas"
                      >
                        Preset Pimpinan Inti
                      </button>
                    </div>
                  </div>

                  {barisStruktur.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-[#CBD5E1] bg-surface/50">
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-secondary text-white text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Baris Pertama
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {barisStruktur.map((baris, idx) => {
                        const selectedInOtherRows = new Set(
                          barisStruktur
                            .filter((b) => b.tempId !== baris.tempId)
                            .map((b) => Number(b.stoId))
                            .filter(Boolean),
                        );
                        const isDuplikat =
                          baris.stoId &&
                          barisStruktur.filter((b) => b.stoId === baris.stoId)
                            .length > 1;

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
                          barisStruktur.filter((b) => b.roleKey === baris.roleKey)
                            .length > 1;

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
                              {/* Kolom STO */}
                              <div className="md:col-span-4">
                                <label className="block text-[10px] font-semibold text-slate-muted mb-1">
                                  Pengurus STO #{idx + 1}
                                </label>
                                <select
                                  value={baris.stoId}
                                  onChange={(e) =>
                                    ubahBaris(baris.tempId, {
                                      stoId: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                                >
                                  <option value="">
                                    -- Pilih Pengurus STO --
                                  </option>
                                  {availableStos
                                    .filter((s) => {
                                      const sudahDiProker = panitiaStoIdSet.has(
                                        s.id,
                                      );
                                      const sudahDiBarisLain =
                                        selectedInOtherRows.has(s.id);
                                      const isRowIni =
                                        String(s.id) === String(baris.stoId);
                                      return (
                                        (!sudahDiProker && !sudahDiBarisLain) ||
                                        isRowIni
                                      );
                                    })
                                    .map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.nama}
                                      </option>
                                    ))}
                                </select>
                                {isDuplikat && (
                                  <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                    Pengurus STO ini sudah dipilih di baris lain
                                  </p>
                                )}
                              </div>

                              {/* Kolom Peran */}
                              <div className="md:col-span-4">
                                <label className="block text-[10px] font-semibold text-slate-muted mb-1">
                                  Peran Panitia
                                </label>
                                <select
                                  value={baris.roleKey}
                                  onChange={(e) =>
                                    ubahBaris(baris.tempId, {
                                      roleKey: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                                >
                                  <optgroup label="Pimpinan Inti (PI)">
                                    {OPSI_PERAN_PANITIA.filter((o) =>
                                      o.kategori.includes("PI"),
                                    ).map((opsi) => (
                                      <option key={opsi.key} value={opsi.key}>
                                        {opsi.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Penanggung Jawab (PJ) & Pengawas">
                                    {OPSI_PERAN_PANITIA.filter((o) =>
                                      o.kategori.includes("PJ"),
                                    ).map((opsi) => (
                                      <option key={opsi.key} value={opsi.key}>
                                        {opsi.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="Anggota Panitia">
                                    {OPSI_PERAN_PANITIA.filter((o) =>
                                      o.kategori.includes("Anggota"),
                                    ).map((opsi) => (
                                      <option key={opsi.key} value={opsi.key}>
                                        {opsi.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                                {isDuplikatPeran && (
                                  <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                    Peran pimpinan inti tidak boleh duplikat
                                  </p>
                                )}
                                {isSekumSebagaiSekretarisInti && (
                                  <p className="text-[10px] text-rose-500 font-semibold mt-1">
                                    Sekretaris Umum tidak dapat ditugaskan sebagai Sekretaris Inti
                                  </p>
                                )}
                              </div>

                              {/* Kolom Divisi / Departemen */}
                              <div className="md:col-span-3">
                                <label className="block text-[10px] font-semibold text-slate-muted mb-1">
                                  Divisi / Departemen
                                </label>
                                <input
                                  type="text"
                                  readOnly
                                  value={baris.divisiPanitia}
                                  title={baris.divisiPanitia}
                                  placeholder="Divisi pengurus"
                                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs text-navy focus:outline-none cursor-default truncate"
                                />
                              </div>

                              {/* Tombol Hapus Baris */}
                              <div className="md:col-span-1 flex items-end justify-center pt-3 md:pt-4">
                                <button
                                  type="button"
                                  onClick={() => hapusBaris(baris.tempId)}
                                  className="p-2 rounded-xl text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <datalist id="list-divisi-sto">
                        {daftarDivisiSto.map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </div>
                  )}

                  {/* Ringkasan status */}
                  <div className="flex items-center justify-between text-[11px] text-slate-muted pt-1">
                    <span>
                      Total baris: <strong>{barisStruktur.length}</strong> orang
                      • STO tersedia: <strong>{stoBelumMasuk.length}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => tambahBaris()}
                      disabled={stoBelumMasuk.length <= barisStruktur.length}
                      className="text-secondary font-semibold hover:underline inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Tambah baris
                    </button>
                  </div>
                </div>
              ) : (
                /* Tab CSV Import */
                <div className="space-y-4">
                  {/* Banner Unduh Template */}
                  <div className="p-4 rounded-2xl bg-surface border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-navy flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Template File CSV Kepanitiaan
                      </div>
                      <p className="text-[11px] text-slate-muted">
                        Format kolom:{" "}
                        <code className="px-1.5 py-0.5 bg-white rounded border border-[#CBD5E1] text-[10px] font-mono text-navy">
                          NIM,Peran,Divisi_Panitia
                        </code>{" "}
                        (contoh: 223141001, ketua, Divisi Workshop)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={unduhTemplateCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-secondary/10 border border-secondary/30 text-secondary text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Template (.CSV)
                    </button>
                  </div>

                  {/* Upload Box */}
                  <div className="p-5 rounded-2xl border-2 border-dashed border-[#CBD5E1] hover:border-secondary transition-colors text-center bg-white">
                    <Upload className="w-8 h-8 text-secondary mx-auto mb-2" />
                    <p className="text-xs font-bold text-navy mb-0.5">
                      Pilih berkas CSV untuk diimpor
                    </p>
                    <p className="text-[11px] text-slate-muted mb-3">
                      Sistem akan mencocokkan NIM dengan pengurus STO periode
                      aktif secara otomatis.
                    </p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/20 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      {csvFileName ? "Ganti Berkas CSV" : "Pilih Berkas CSV"}
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleCsvChange}
                        className="hidden"
                      />
                    </label>
                    {csvFileName && (
                      <div className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 py-1 px-3 rounded-lg inline-block border border-emerald-200">
                        📄 {csvFileName} ({csvPreview.length} baris terdeteksi)
                      </div>
                    )}
                  </div>

                  {/* Preview CSV */}
                  {csvPreview.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-navy">
                          Pratinjau Data Impor ({csvPreview.length} Baris)
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                            {csvPreview.filter((p) => p.valid).length} Valid
                          </span>
                          {csvPreview.filter((p) => !p.valid).length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                              {csvPreview.filter((p) => !p.valid).length}{" "}
                              Bermasalah
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface text-slate-muted font-semibold sticky top-0 border-b border-[#E2E8F0]">
                            <tr>
                              <th className="px-3 py-2">No</th>
                              <th className="px-3 py-2">NIM</th>
                              <th className="px-3 py-2">Nama STO</th>
                              <th className="px-3 py-2">Peran & Divisi</th>
                              <th className="px-3 py-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E2E8F0]">
                            {csvPreview.map((item, idx) => (
                              <tr
                                key={idx}
                                className={
                                  item.valid
                                    ? "hover:bg-surface/50"
                                    : "bg-rose-50/50"
                                }
                              >
                                <td className="px-3 py-2 font-mono text-slate-muted">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2 font-mono font-medium text-navy">
                                  {item.nim}
                                </td>
                                <td className="px-3 py-2 font-semibold text-navy">
                                  {item.stoNama || (
                                    <span className="text-rose-600 italic">
                                      Tidak Ditemukan
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-slate-muted">
                                  <span className="font-medium text-navy">
                                    {item.peran}
                                  </span>
                                  {item.divisi && ` • ${item.divisi}`}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  {item.valid ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Siap Impor
                                    </span>
                                  ) : (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200"
                                      title={item.pesanError}
                                    >
                                      {item.pesanError || "Tidak Valid"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ModalBody>

            <ModalFooter>
              <button
                type="button"
                onClick={() => setModalPanitiaBuka(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer"
              >
                Batal
              </button>

              {tabModalPanitia === "struktur" ? (
                <button
                  type="button"
                  onClick={handleSubmitBanyakPanitia}
                  disabled={isPending || barisStruktur.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-secondary/25 cursor-pointer"
                >
                  {isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Simpan Susunan Panitia
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleProsesImporCsv}
                  disabled={
                    isPending ||
                    csvRawList.length === 0 ||
                    csvPreview.filter((p) => p.valid).length === 0
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-secondary/25 cursor-pointer"
                >
                  {isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Mulai Impor Panitia (
                  {csvPreview.filter((p) => p.valid).length} Valid)
                </button>
              )}
            </ModalFooter>
          </div>
        </Modal>
      )}

      {modalEditPanitiaBuka && panitiaDiedit && (
        <Modal
          onClose={() => setModalEditPanitiaBuka(false)}
          ariaLabel="Ubah peran panitia"
          size="md"
        >
          <form
            onSubmit={handleSubmitEditPanitia}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ModalHeader
              title={`Ubah Peran Panitia (${panitiaDiedit.sto.nama})`}
              icon={Users}
              onClose={() => setModalEditPanitiaBuka(false)}
            />
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Peran / Posisi Panitia Baru
                  </label>
                  <select
                    value={selectedRoleKeyEdit}
                    onChange={(e) => setSelectedRoleKeyEdit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <optgroup label="Pimpinan Inti (PI)">
                      {OPSI_PERAN_PANITIA.filter((o) =>
                        o.kategori.includes("PI"),
                      ).map((opsi) => (
                        <option key={opsi.key} value={opsi.key}>
                          {opsi.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Penanggung Jawab (PJ) & Pengawas">
                      {OPSI_PERAN_PANITIA.filter((o) =>
                        o.kategori.includes("PJ"),
                      ).map((opsi) => (
                        <option key={opsi.key} value={opsi.key}>
                          {opsi.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Anggota Panitia">
                      {OPSI_PERAN_PANITIA.filter((o) =>
                        o.kategori.includes("Anggota"),
                      ).map((opsi) => (
                        <option key={opsi.key} value={opsi.key}>
                          {opsi.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Divisi / Departemen
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={divisiPanitiaEdit}
                    placeholder="Divisi pengurus"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-slate-50 text-xs text-navy focus:outline-none cursor-default"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Nama Pengurus STO
                  </label>
                  <div className="p-3.5 rounded-xl bg-surface border border-[#E2E8F0] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {panitiaDiedit.sto.nama.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-navy truncate">
                        {panitiaDiedit.sto.nama}
                      </p>
                      <p className="text-[10px] text-slate-muted truncate">
                        {panitiaDiedit.sto.nim} •{" "}
                        {panitiaDiedit.sto.emailGoogle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={() => setModalEditPanitiaBuka(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan Perubahan
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────
          MODAL TAMBAH / EDIT AGENDA (termasuk titik lokasi presensi)
      ───────────────────────────────────────────── */}
      {(modalAgendaBuka || modalEditAgendaBuka) && (
        <Modal
          onClose={() => {
            setModalAgendaBuka(false);
            setModalEditAgendaBuka(false);
            resetFormAgenda();
          }}
          ariaLabel={modalAgendaBuka ? "Tambah agenda" : "Edit agenda"}
          size="lg"
        >
          <form
            onSubmit={
              modalAgendaBuka
                ? handleSubmitTambahAgenda
                : handleSubmitEditAgenda
            }
            className="flex min-h-0 flex-1 flex-col"
          >
            <ModalHeader
              title={
                modalAgendaBuka
                  ? "Tambah Agenda Kegiatan Baru"
                  : "Edit Agenda Kegiatan"
              }
              description="Titik presensi diatur di sini; semua sesi memakai titik yang sama."
              icon={Calendar}
              onClose={() => {
                setModalAgendaBuka(false);
                setModalEditAgendaBuka(false);
                resetFormAgenda();
              }}
            />
            <ModalBody>
              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Judul Agenda
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rapat Pleno 1 Persiapan Lomba"
                  value={judulAgenda}
                  onChange={(e) => setJudulAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Jenis Agenda
                  </label>
                  <select
                    value={jenisAgenda}
                    onChange={(e) =>
                      setJenisAgenda(e.target.value as JenisAgenda)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  >
                    <option value={JenisAgenda.rapat_pj}>Rapat PJ & PI</option>
                    <option value={JenisAgenda.rapat_besar}>Rapat Besar</option>
                    <option value={JenisAgenda.rapat_koordinasi}>
                      Rapat Koordinasi
                    </option>
                    <option value={JenisAgenda.hari_h}>
                      Hari H Pelaksanaan
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Urutan Agenda
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={urutanAgenda}
                    onChange={(e) =>
                      setUrutanAgenda(parseInt(e.target.value) || 1)
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={tglAgenda}
                    onChange={(e) => setTglAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Tanggal Selesai (Opsional)
                  </label>
                  <input
                    type="date"
                    min={tglAgenda || undefined}
                    value={tglSelesaiAgenda}
                    onChange={(e) => setTglSelesaiAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-muted -mt-1">
                Biarkan tanggal selesai kosong bila agenda hanya satu hari.
                Agenda multi-hari boleh punya sesi presensi di tanggal mana pun
                di dalam rentang ini.
              </p>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Jam Mulai Agenda (WIB)
                </label>
                <input
                  type="time"
                  required
                  value={waktuAgenda}
                  onChange={(e) => setWaktuAgenda(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy mb-1">
                  Target Peserta (Akses Presensi)
                </label>
                <select
                  value={targetPeserta}
                  onChange={(e) =>
                    setTargetPeserta(e.target.value as TargetPeserta)
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                >
                  <option value={TargetPeserta.hanya_pj_pi}>
                    hanya_pj_pi (Hanya Panitia berstatus PJ dan PI)
                  </option>
                  <option value={TargetPeserta.semua_panitia}>
                    semua_panitia (Seluruh panitia terdaftar di proker ini)
                  </option>
                  <option value={TargetPeserta.semua_panitia_sto}>
                    semua_panitia_sto (Semua anggota STO satu periode)
                  </option>
                </select>
                <p className="text-[10px] text-slate-muted mt-1">
                  Aturan akses ini menentukan siapa saja yang dapat melihat
                  agenda ini di /home dan melakukan scan presensi.
                </p>
              </div>

              <div className="pt-1 border-t border-[#E2E8F0] space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">
                    Lokasi Pertemuan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ruang Sidang Utama Lt. 2 / Google Meet"
                    value={lokasiAgenda}
                    onChange={(e) => setLokasiAgenda(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Titik dari Master Lokasi
                    </label>
                    <select
                      value={lokasiAgendaId}
                      onChange={(e) => pilihLokasiMaster(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    >
                      <option value="">-- Titik manual (peta) --</option>
                      {daftarLokasi.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nama} (radius {l.radiusM} m)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-navy mb-1">
                      Radius Presensi (m)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={5000}
                      value={radiusAgenda}
                      onChange={(e) =>
                        setRadiusAgenda(parseInt(e.target.value) || 500)
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] p-3 bg-surface/60">
                  <p className="text-[10px] text-slate-muted mb-2">
                    Titik presensi melekat pada agenda (bukan sesi). Semua sesi
                    agenda ini memakai titik &amp; radius yang sama.
                  </p>
                  <PetaPilihLokasi
                    lat={titikAgendaAktif.lat}
                    lng={titikAgendaAktif.lng}
                    radiusM={radiusAgenda}
                    tinggi="220px"
                    onPilih={(lat, lng) => setTitikAgenda({ lat, lng })}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <button
                type="button"
                onClick={() => {
                  setModalAgendaBuka(false);
                  setModalEditAgendaBuka(false);
                  resetFormAgenda();
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-muted hover:bg-surface hover:text-navy cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-60 shadow-md shadow-secondary/25 cursor-pointer transition-all"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Simpan Agenda
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* MODAL SESI PRESENSI (buat/ubah) */}
      {modalSesi && (
        <SesiModal
          agendaId={modalSesi.agenda.id}
          judulAgenda={modalSesi.agenda.judul}
          tglMulai={keTanggalWib(modalSesi.agenda.tglPelaksanaan)}
          tglSelesai={
            modalSesi.agenda.tglSelesai
              ? keTanggalWib(modalSesi.agenda.tglSelesai)
              : null
          }
          jamAgendaWib={jamDariWaktuAgenda(modalSesi.agenda.waktuPelaksanaan)}
          lokasiNama={modalSesi.agenda.lokasiNama}
          radiusM={modalSesi.agenda.radiusM}
          sesiAwal={modalSesi.sesiAwal}
          onTutup={() => setModalSesi(null)}
        />
      )}
    </div>
  );
}
