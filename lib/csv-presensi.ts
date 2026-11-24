// lib/csv-presensi.ts
// Penyusun isi file CSV daftar kehadiran yang terstruktur rapi (siap dibuka di Excel / Spreadsheet).
import type { RekapKehadiranSesi, StatusKehadiran } from "./kehadiran";
import { formatJamIndo, formatTanggalIndo } from "./waktu";
import { formatLabelDivisi } from "./divisi";

export const LABEL_STATUS_CSV: Record<StatusKehadiran, string> = {
  hadir: "Hadir",
  terlambat: "Terlambat",
  izin_disetujui: "Izin",
  izin_menunggu: "Izin (Menunggu)",
  alpa: "Alpa",
  ditolak: "Ditolak",
};

const LABEL_JENIS_AGENDA: Record<string, string> = {
  hari_h: "Hari H Acara",
  rapat_besar: "Rapat Besar",
  rapat_koordinasi: "Rapat Koordinasi",
  rapat_pj: "Rapat PJ & PI",
};

export const HEADER_TABEL_CSV = [
  "No",
  "NIM",
  "Nama Lengkap",
  "Divisi / Departemen",
  "Peran / Jabatan",
  "Status Kehadiran",
  "Waktu Presensi",
  "Terlambat (Menit)",
  "Jarak Lokasi",
  "Keterangan TTD",
] as const;

/**
 * Bungkus nilai agar aman di dalam format CSV (RFC 4180)
 * dan netralkan karakter pemicu CSV/Formula Injection (CWE-1236).
 */
export function selCsv(nilai: string | number | null | undefined): string {
  let teks = nilai === null || nilai === undefined ? "" : String(nilai);
  if (/^[=+\-@\t\r]/.test(teks)) {
    teks = "'" + teks;
  }
  return `"${teks.replace(/"/g, '""')}"`;
}

function barisCsv(kolom: (string | number | null | undefined)[]): string {
  return kolom.map(selCsv).join(",");
}

/**
 * Menyusun CSV lengkap dengan blok informasi kegiatan di atas, tabel peserta bernomor,
 * dan blok ringkasan kehadiran di bawah. Menyertakan `sep=,` agar Microsoft Excel
 * (termasuk regional Indonesia) otomatis memisahkan kolom menjadi tabel rapi.
 */
export function susunCsvKehadiran(rekap: RekapKehadiranSesi): string {
  const bukaDate = new Date(rekap.bukaAt);
  const tutupDate = new Date(rekap.tutupAt);
  const labelJenis =
    LABEL_JENIS_AGENDA[rekap.jenisAgenda] ?? String(rekap.jenisAgenda);

  const baris: string[] = [
    "sep=,",
    barisCsv(["DAFTAR HADIR KEGIATAN UKM PCC"]),
    barisCsv(["Periode", rekap.periodeNama]),
    barisCsv(["Program Kerja", rekap.namaProker]),
    barisCsv(["Nama Kegiatan", `${rekap.judulAgenda} (${labelJenis})`]),
    barisCsv(["Hari, Tanggal", formatTanggalIndo(bukaDate)]),
    barisCsv([
      "Waktu Sesi",
      `${formatJamIndo(bukaDate)} – ${formatJamIndo(tutupDate)}`,
    ]),
    barisCsv(["Tempat", rekap.lokasiNama || "—"]),
    "",
    barisCsv([...HEADER_TABEL_CSV]),
  ];

  rekap.baris.forEach((b, index) => {
    const hadirSah =
      b.statusKehadiran === "hadir" || b.statusKehadiran === "terlambat";

    const waktuPresensi =
      hadirSah && b.waktuScan ? formatJamIndo(new Date(b.waktuScan)) : "—";

    let menitTerlambatStr = "—";
    if (b.statusKehadiran === "terlambat") {
      menitTerlambatStr = String(b.menitTerlambat);
    } else if (b.statusKehadiran === "hadir") {
      menitTerlambatStr = "0";
    }

    let jarakStr = "—";
    if (b.presensiId) {
      jarakStr = b.manual ? "Input Manual" : `${b.jarakM ?? 0} m`;
    }

    let ketTtd = "—";
    if (hadirSah) {
      ketTtd = b.ttd ? "TTD Terlampir" : "Hadir (Belum Upload TTD)";
    }

    const peranJabatan = b.divisiPanitia || b.jabatan || "—";

    baris.push(
      barisCsv([
        index + 1,
        b.nim,
        b.nama,
        b.divisi ? formatLabelDivisi(b.divisi) : "—",
        peranJabatan,
        LABEL_STATUS_CSV[b.statusKehadiran] ?? b.statusKehadiran,
        waktuPresensi,
        menitTerlambatStr,
        jarakStr,
        ketTtd,
      ])
    );
  });

  baris.push(
    "",
    barisCsv(["RINGKASAN KEHADIRAN"]),
    barisCsv(["Hadir Tepat Waktu", rekap.ringkasan.hadir]),
    barisCsv(["Hadir Terlambat", rekap.ringkasan.terlambat]),
    barisCsv(["Izin Disetujui", rekap.ringkasan.izin]),
    barisCsv(["Tanpa Keterangan (Alpa)", rekap.ringkasan.alpa]),
    barisCsv(["Total Peserta Wajib", rekap.ringkasan.total])
  );

  return "\uFEFF" + baris.join("\r\n");
}
