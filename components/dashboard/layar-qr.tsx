// components/dashboard/layar-qr.tsx
// Layar proyektor: QR dinamis (berputar tiap 14 menit) + daftar hadir langsung.
"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ubahTutupSesiAction, tutupSesiSekarangAction } from "@/lib/actions/sesi";
import { verifikasiPresensiAction } from "@/lib/actions/presensi";
import { formatJamIndo, keInputLokalWib } from "@/lib/waktu";
import {
  RefreshCw,
  PowerOff,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Timer,
  Download,
  QrCode,
  Save,
} from "lucide-react";

interface DataQr {
  payload: string;
  detikSisa: number;
  status: "belum_dibuka" | "berjalan" | "ditutup";
  bukaAt: string;
  tutupAt: string;
  radiusM: number | null;
}

interface BarisHadir {
  id: number;
  waktuScan: string;
  status: "hadir" | "terlambat";
  jarakM: number;
  diLuarRadius: boolean;
  statusVerifikasi: "menunggu" | "diterima" | "ditolak";
  sto: { id: number; nama: string; nim: string; divisi: string | null };
}

interface Props {
  sesiId: number;
  judulAgenda: string;
  namaProker: string;
  lokasiNama: string | null;
  isReadonly: boolean;
}

/** Ubah sisa detik menjadi "m:ss" (contoh: 13:20). */
function formatDetik(detik?: number): string {
  if (typeof detik !== "number") return "-";
  const menit = Math.floor(detik / 60);
  const sisa = detik % 60;
  return `${menit}:${sisa.toString().padStart(2, "0")}`;
}

/**
 * Kontrol jam maksimum kedatangan sesi. Dipasang dengan key={tutupAt} supaya nilai
 * awalnya ikut berubah saat server memperbarui jadwal (tanpa setState di effect).
 */
function KontrolWaktu({
  sesiId,
  tutupAt,
  onBerubah,
}: {
  sesiId: number;
  tutupAt: string;
  onBerubah: () => void;
}) {
  const [jam, setJam] = useState(() => keInputLokalWib(new Date(tutupAt)).split("T")[1] ?? "00:00");
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(null);

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);
    startTransition(async () => {
      const hasil = await ubahTutupSesiAction(sesiId, jam);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Jam maksimum kedatangan diperbarui" });
      onBerubah();
    });
  }

  function tutupSekarang() {
    if (!confirm("Tutup sesi ini sekarang? STO tidak bisa absen lagi setelah ditutup.")) return;
    setPesan(null);
    startTransition(async () => {
      const hasil = await tutupSesiSekarangAction(sesiId);
      if (hasil.error) {
        setPesan({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesan({ tipe: "sukses", teks: hasil.pesan ?? "Sesi ditutup" });
      onBerubah();
    });
  }

  return (
    <div className="mt-5 w-full space-y-3">
      <form onSubmit={simpan} className="flex flex-wrap items-end justify-center gap-2">
        <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 space-y-1">
          <span className="block">Jam maks. kedatangan (WIB)</span>
          <input
            type="time"
            required
            value={jam}
            onChange={(e) => setJam(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Simpan
        </button>
        <button
          type="button"
          onClick={tutupSekarang}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[11px] font-semibold disabled:opacity-60 transition-colors"
        >
          <PowerOff className="w-3.5 h-3.5" />
          Tutup sekarang
        </button>
      </form>

      {pesan && (
        <p
          className={`text-[11px] flex items-center justify-center gap-1 ${
            pesan.tipe === "sukses" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          {pesan.teks}
        </p>
      )}
    </div>
  );
}

export function LayarQr({ sesiId, judulAgenda, namaProker, lokasiNama, isReadonly }: Props) {
  const [data, setData] = useState<DataQr | null>(null);
  const [daftar, setDaftar] = useState<BarisHadir[]>([]);
  const [ringkasan, setRingkasan] = useState({
    total: 0,
    hadir: 0,
    terlambat: 0,
    perluVerifikasi: 0,
  });
  const [galat, setGalat] = useState<string | null>(null);
  const [pesanHadir, setPesanHadir] = useState<{ tipe: "sukses" | "error"; teks: string } | null>(
    null
  );
  const [memverifikasi, setMemverifikasi] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const kanvasQrRef = useRef<HTMLCanvasElement | null>(null);

  const ambilQr = useCallback(async () => {
    try {
      const res = await fetch(`/api/presensi/qr-token?sesiId=${sesiId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setGalat(json?.error?.pesan ?? "Gagal mengambil token QR");
        return;
      }
      setGalat(null);
      setData(json as DataQr);
    } catch {
      setGalat("Koneksi ke server gagal");
    }
  }, [sesiId]);

  const ambilHadir = useCallback(async () => {
    try {
      const res = await fetch(`/api/presensi/hadir?sesiId=${sesiId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) return;
      setDaftar(json.daftar as BarisHadir[]);
      setRingkasan(json.ringkasan);
    } catch {
      // diamkan; percobaan berikutnya akan mencoba lagi
    }
  }, [sesiId]);

  function verifikasi(presensiId: number, keputusan: "diterima" | "ditolak") {
    setPesanHadir(null);
    setMemverifikasi(presensiId);
    startTransition(async () => {
      const hasil = await verifikasiPresensiAction(presensiId, keputusan);
      setMemverifikasi(null);
      if (hasil.error) {
        setPesanHadir({ tipe: "error", teks: hasil.error.pesan });
        return;
      }
      setPesanHadir({ tipe: "sukses", teks: hasil.pesan ?? "Verifikasi tersimpan" });
      ambilHadir();
    });
  }

  useEffect(() => {
    const mulai = setTimeout(() => {
      ambilQr();
      ambilHadir();
    }, 0);
    const t1 = setInterval(ambilQr, 4000);
    const t2 = setInterval(ambilHadir, 4000);
    return () => {
      clearTimeout(mulai);
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [ambilQr, ambilHadir]);

  function unduhQr() {
    const kanvas = kanvasQrRef.current;
    if (!kanvas || !data) return;

    const tautan = document.createElement("a");
    tautan.href = kanvas.toDataURL("image/png");
    tautan.download = `qr-presensi-sesi${sesiId}-${data.payload.slice(-8)}.png`;
    document.body.appendChild(tautan);
    tautan.click();
    document.body.removeChild(tautan);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Kolom QR */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center">
        <div className="w-full text-center mb-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            {namaProker}
          </p>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{judulAgenda}</h1>
          <p className="text-xs text-zinc-500 mt-0.5 inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {lokasiNama ?? "Titik agenda"} • radius {data?.radiusM ?? "-"} m
          </p>
        </div>

        {data && data.status === "berjalan" ? (
          <>
            <div className="p-4 rounded-2xl bg-white border border-zinc-200">
              <QRCodeCanvas
                ref={kanvasQrRef}
                value={data.payload}
                size={288}
                level="M"
                marginSize={2}
              />
            </div>

            <button
              onClick={unduhQr}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh QR (PNG)
            </button>

            <div className="mt-4 flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200">
                <Timer className="w-3.5 h-3.5 text-blue-500" />
                QR reset dalam {formatDetik(data?.detikSisa)}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Sesi berjalan
              </span>
            </div>
          </>
        ) : (
          <div className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 py-8 px-4 text-center space-y-1.5">
            <QrCode className="w-7 h-7 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {!data
                ? "Memuat status sesi..."
                : data.status === "belum_dibuka"
                  ? "QR muncul saat sesi dibuka"
                  : "Sesi selesai — QR tidak ditampilkan"}
            </p>
            {data && (
              <p className="text-[11px] text-zinc-500">
                Jadwal {formatJamIndo(new Date(data.bukaAt))}–{formatJamIndo(new Date(data.tutupAt))} WIB
              </p>
            )}
          </div>
        )}

        {data && (
          <p className="mt-2 text-[11px] text-zinc-500 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Buka {formatJamIndo(new Date(data.bukaAt))} • Tutup {formatJamIndo(new Date(data.tutupAt))}
          </p>
        )}

        {galat && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400 inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {galat}
          </p>
        )}

        {!isReadonly && data && (
          <KontrolWaktu key={data.tutupAt} sesiId={sesiId} tutupAt={data.tutupAt} onBerubah={ambilQr} />
        )}
      </div>

      {/* Kolom daftar hadir */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Daftar Hadir Langsung
          </h2>
          <button
            onClick={() => {
              ambilQr();
              ambilHadir();
            }}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            title="Muat ulang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 text-center">
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{ringkasan.total}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Total</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-center">
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {ringkasan.hadir}
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Hadir
            </p>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3 text-center">
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {ringkasan.terlambat}
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Terlambat
            </p>
          </div>
        </div>

        {ringkasan.perluVerifikasi > 0 && (
          <p className="mb-3 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl px-3 py-2">
            {ringkasan.perluVerifikasi} presensi berada di luar radius dan menunggu verifikasi Anda.
          </p>
        )}

        <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2 pr-1 scrollbar-none" data-lenis-prevent>
          {daftar.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">
              Belum ada yang melakukan presensi.
            </p>
          ) : (
            daftar.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                      {p.sto.nama}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {p.sto.nim} • {p.sto.divisi ?? "Umum"} • {p.jarakM} m
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-zinc-500">
                      {formatJamIndo(new Date(p.waktuScan))}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        p.statusVerifikasi === "ditolak"
                          ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 line-through"
                          : p.status === "hadir"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>

                {p.diLuarRadius && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Di luar radius ({p.jarakM} m)
                      {p.statusVerifikasi === "menunggu" && " • perlu verifikasi"}
                      {p.statusVerifikasi === "diterima" && " • diterima"}
                      {p.statusVerifikasi === "ditolak" && " • ditolak"}
                    </span>

                    {p.statusVerifikasi === "menunggu" && !isReadonly && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => verifikasi(p.id, "diterima")}
                          disabled={memverifikasi === p.id}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[10px] font-bold transition-colors"
                        >
                          Terima
                        </button>
                        <button
                          onClick={() => verifikasi(p.id, "ditolak")}
                          disabled={memverifikasi === p.id}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-[10px] font-bold transition-colors"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {pesanHadir && (
          <p
            className={`mt-3 text-[11px] inline-flex items-center gap-1 ${
              pesanHadir.tipe === "sukses" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {pesanHadir.tipe === "sukses" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            {pesanHadir.teks}
          </p>
        )}
      </div>
    </div>
  );
}
