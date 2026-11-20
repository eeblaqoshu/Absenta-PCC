// components/scan-presensi/types.ts

export interface PresensiSesiRingkas {
  status: "hadir" | "terlambat";
  waktuScan: string;
  jarakM: number;
  diLuarRadius: boolean;
  statusVerifikasi: "menunggu" | "diterima" | "ditolak";
}

export interface SesiTersedia {
  sesiId: number;
  agendaId: number;
  judulAgenda: string;
  namaProker: string;
  lokasiNama: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  bukaAt: string;
  tutupAt: string;
  /** Presensi STO pada sesi ini; null bila belum absen. */
  presensi: PresensiSesiRingkas | null;
}

export interface Koordinat {
  lat: number;
  lng: number;
  akurasi: number;
  ts: number;
}

export interface HasilScan {
  sukses: boolean;
  pesan: string;
  sesiId?: number;
  agendaJudul?: string;
  status?: "hadir" | "terlambat";
  jarakM?: number;
  radiusM?: number;
  diLuarRadius?: boolean;
  statusVerifikasi?: "menunggu" | "diterima" | "ditolak";
  waktuScan?: string;
  perluLogin?: boolean;
}
