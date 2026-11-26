// components/dashboard/export-pdf-daftar-hadir.tsx
// Halaman pratinjau & Export PDF Daftar Hadir sesuai format resmi UKM PCC.
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, Upload } from "lucide-react";
import { formatLabelDivisi } from "@/lib/divisi";
import type { BarisKehadiran, RekapKehadiranSesi } from "@/lib/kehadiran";

export interface PenandatanganDaftarHadir {
  jabatan: string;
  nama: string;
  nim: string;
  ttd: string | null;
}

interface ExportPdfDaftarHadirProps {
  rekap: RekapKehadiranSesi;
  hariTanggalLabel: string;
  waktuSesiLabel: string;
  acaraDefault: string;
  subjudulDefault: string;
  penandatanganDefault: PenandatanganDaftarHadir;
  isAdmin: boolean;
}

const URUTAN_SIE = [
  "sie acara",
  "acara",
  "sie humas",
  "humas",
  "sie perkap",
  "perlengkapan",
  "perkap",
  "sie dekdok",
  "dekdok",
  "dokumentasi",
  "sie konsumsi",
  "konsumsi",
  "sie kreatif",
  "kreatif",
];

function skorUrutanPeserta(b: BarisKehadiran): number {
  const dp = (b.divisiPanitia || "").toLowerCase().trim();
  const peran = b.peran;

  if (peran === "ketua" && !dp.includes("wakil")) return 10;
  if (
    peran === "ketua" ||
    dp.includes("wakil ketua") ||
    dp.includes("waketuplak")
  ) {
    return 20;
  }
  if (peran === "sekretaris" || dp.includes("sekretaris")) return 30;
  if (peran === "bendahara" || dp.includes("bendahara")) return 40;
  if (dp.includes("litbang")) return 50;

  for (let i = 0; i < URUTAN_SIE.length; i++) {
    if (dp.includes(URUTAN_SIE[i])) {
      const subSkor = peran === "pj_divisi" ? 0 : 1;
      return 100 + i * 5 + subSkor;
    }
  }

  if (peran === "pj_divisi") return 500;
  if (peran === "anggota") return 600;
  return 800;
}

function urutkanPeserta(baris: BarisKehadiran[]): BarisKehadiran[] {
  return [...baris].sort((a, b) => {
    const sa = skorUrutanPeserta(a);
    const sb = skorUrutanPeserta(b);
    if (sa !== sb) return sa - sb;
    const divA = a.divisiPanitia || a.divisi || "";
    const divB = b.divisiPanitia || b.divisi || "";
    const cmpDiv = divA.localeCompare(divB, "id");
    if (cmpDiv !== 0) return cmpDiv;
    return a.nama.localeCompare(b.nama, "id");
  });
}

function formatJabatanTabel(b: BarisKehadiran): string {
  const raw = (b.divisiPanitia || "").trim();
  if (raw) {
    if (/^wakil\s+ketua\s+pelaksana$/i.test(raw)) return "Wakil Ketua";
    if (/^sekretaris\s+(inti|pelaksana)$/i.test(raw)) return "Sekretaris";
    if (/^bendahara\s+(inti|pelaksana)$/i.test(raw)) return "Bendahara";
    if (/^(penanggung\s+jawab|pj|anggota)\s+(sie\s+.+)$/i.test(raw)) {
      return raw.replace(/^(penanggung\s+jawab|pj|anggota)\s+/i, "");
    }
    return raw;
  }
  if (b.peran === "ketua") return "Ketua Pelaksana";
  if (b.peran === "sekretaris") return "Sekretaris";
  if (b.peran === "bendahara") return "Bendahara";
  return b.jabatan || formatLabelDivisi(b.divisi);
}

function formatJamTitikWib(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const jam = bagian.find((p) => p.type === "hour")?.value ?? "00";
  const menit = bagian.find((p) => p.type === "minute")?.value ?? "00";
  return `${jam}.${menit}`;
}

export function ExportPdfDaftarHadir({
  rekap,
  hariTanggalLabel,
  waktuSesiLabel,
  acaraDefault,
  subjudulDefault,
  penandatanganDefault,
  isAdmin,
}: ExportPdfDaftarHadirProps) {
  const [subjudul, setSubjudul] = useState(subjudulDefault);
  const [acara, setAcara] = useState(acaraDefault);
  const [jabatanTtd, setJabatanTtd] = useState(penandatanganDefault.jabatan);
  const [namaTtd, setNamaTtd] = useState(penandatanganDefault.nama);
  const [nimTtd, setNimTtd] = useState(penandatanganDefault.nim);

  const barisTerurut = urutkanPeserta(rekap.baris);

  const pesertaHadir = barisTerurut.filter(
    (b) => b.statusKehadiran === "hadir" || b.statusKehadiran === "terlambat",
  );
  const hadirDenganTtd = pesertaHadir.filter((b) => Boolean(b.ttd)).length;
  const hadirTanpaTtd = pesertaHadir.length - hadirDenganTtd;

  return (
    <div className="space-y-5 pb-12 print:space-y-0 print:pb-0">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm 14mm 16mm 14mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          thead {
            display: table-header-group;
          }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Panel Kontrol Layar (tidak ikut tercetak ke PDF) */}
      <div className="print:hidden rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/presensi/${rekap.sesiId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-secondary transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Sesi #{rekap.sesiId}
              </Link>
              <span className="text-xs text-slate-muted">•</span>
              <span className="text-xs font-semibold text-secondary">
                {rekap.periodeNama}
              </span>
            </div>
            <h1 className="text-lg font-bold text-primary">
              Export PDF Daftar Hadir
            </h1>
            <p className="text-xs text-slate-muted">
              TTD digital otomatis terlampir pada kolom tanda tangan bagi
              peserta yang sudah absen ({hadirDenganTtd}/{pesertaHadir.length}{" "}
              peserta hadir memiliki TTD).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {hadirTanpaTtd > 0 && isAdmin && (
              <Link
                href="/dashboard/sto"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] bg-surface hover:bg-white text-xs font-semibold text-navy transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-secondary" />
                Upload Source TTD ({hadirTanpaTtd} belum ada)
              </Link>
            )}
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Export / Simpan PDF
            </button>
          </div>
        </div>

        {/* Penyesuaian Cepat Label Dokumen sebelum Export PDF */}
        <div className="pt-3 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-muted mb-1">
              Subjudul Daftar Hadir
            </label>
            <input
              type="text"
              suppressHydrationWarning
              value={subjudul}
              onChange={(e) => setSubjudul(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-muted mb-1">
              Nama Acara
            </label>
            <input
              type="text"
              suppressHydrationWarning
              value={acara}
              onChange={(e) => setAcara(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:border-secondary"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-muted mb-1">
              Jabatan Penandatangan
            </label>
            <input
              type="text"
              suppressHydrationWarning
              value={jabatanTtd}
              onChange={(e) => setJabatanTtd(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:border-secondary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-muted mb-1">
                Nama TTD Bawah
              </label>
              <input
                type="text"
                suppressHydrationWarning
                value={namaTtd}
                onChange={(e) => setNamaTtd(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:border-secondary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-muted mb-1">
                NIM
              </label>
              <input
                type="text"
                suppressHydrationWarning
                value={nimTtd}
                onChange={(e) => setNimTtd(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:border-secondary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lembar Dokumen A4 sesuai format Daftar Hadir UKM PCC */}
      <div className="max-w-[210mm] mx-auto bg-white border border-[#E2E8F0] rounded-2xl shadow-sm px-6 py-8 sm:px-10 sm:py-10 text-[#000000] print:max-w-none print:border-0 print:rounded-none print:shadow-none print:p-0">
        {/* Judul Tengah */}
        <div className="text-center mb-5 leading-snug">
          <h2 className="text-[15px] font-bold uppercase tracking-wide text-[#000000]">
            DAFTAR HADIR
          </h2>
          {subjudul.trim() && (
            <p className="text-[14px] font-bold uppercase tracking-wide text-[#000000]">
              {subjudul}
            </p>
          )}
        </div>

        {/* Metadata Kegiatan */}
        <table className="text-[12px] mb-4 border-collapse text-[#000000]">
          <tbody>
            <tr>
              <td className="pr-4 py-0.5 align-top whitespace-nowrap">
                hari, tanggal
              </td>
              <td className="pr-2 py-0.5 align-top">:</td>
              <td className="py-0.5 align-top">{hariTanggalLabel}</td>
            </tr>
            <tr>
              <td className="pr-4 py-0.5 align-top whitespace-nowrap">waktu</td>
              <td className="pr-2 py-0.5 align-top">:</td>
              <td className="py-0.5 align-top">{waktuSesiLabel}</td>
            </tr>
            <tr>
              <td className="pr-4 py-0.5 align-top whitespace-nowrap">
                tempat
              </td>
              <td className="pr-2 py-0.5 align-top">:</td>
              <td className="py-0.5 align-top">{rekap.lokasiNama || "-"}</td>
            </tr>
            <tr>
              <td className="pr-4 py-0.5 align-top whitespace-nowrap">acara</td>
              <td className="pr-2 py-0.5 align-top">:</td>
              <td className="py-0.5 align-top">{acara}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabel Utama Daftar Hadir (7 Kolom Fisik: TANDA TANGAN colSpan=2 Ganjil/Genap) */}
        <table className="w-full border-collapse border border-[#000000] text-[11.5px] text-[#000000]">
          <thead>
            <tr className="bg-[#F3F6FB] print:bg-[#F3F6FB]">
              <th className="border border-[#000000] px-1.5 py-2 text-center font-bold w-8">
                NO
              </th>
              <th className="border border-[#000000] px-2.5 py-2 text-center font-bold">
                NAMA
              </th>
              <th className="border border-[#000000] px-2 py-2 text-center font-bold w-[108px]">
                NIM
              </th>
              <th className="border border-[#000000] px-2 py-2 text-center font-bold w-[128px]">
                JABATAN
              </th>
              <th className="border border-[#000000] px-1.5 py-2 text-center font-bold w-16">
                JAM
              </th>
              <th
                colSpan={2}
                className="border border-[#000000] px-2 py-2 text-center font-bold w-[184px]"
              >
                TANDA TANGAN
              </th>
            </tr>
          </thead>
          <tbody>
            {barisTerurut.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="border border-[#000000] px-4 py-6 text-center text-slate-muted"
                >
                  Belum ada peserta terdaftar pada kegiatan ini.
                </td>
              </tr>
            ) : (
              barisTerurut.map((b, idx) => {
                const no = idx + 1;
                const ganjil = no % 2 === 1;
                const hadirSah =
                  b.statusKehadiran === "hadir" ||
                  b.statusKehadiran === "terlambat";

                let isiJam = "";
                if (hadirSah) {
                  isiJam = b.waktuScan
                    ? formatJamTitikWib(b.waktuScan)
                    : "Hadir";
                } else if (b.statusKehadiran === "izin_disetujui") {
                  isiJam = "Izin";
                }

                return (
                  <tr key={b.stoId}>
                    <td className="border border-[#000000] px-1.5 py-1.5 text-center align-middle">
                      {no}
                    </td>
                    <td className="border border-[#000000] px-2.5 py-1.5 align-middle">
                      {b.nama}
                    </td>
                    <td className="border border-[#000000] px-2 py-1.5 text-center align-middle whitespace-nowrap">
                      {b.nim}
                    </td>
                    <td className="border border-[#000000] px-2 py-1.5 text-center align-middle">
                      {formatJabatanTabel(b)}
                    </td>
                    <td className="border border-[#000000] px-1.5 py-1.5 text-center align-middle whitespace-nowrap">
                      {isiJam}
                    </td>

                    {/* Sub-kolom TTD Kiri (Nomor Ganjil: 1, 3, 5, ...) */}
                    <td className="border border-[#000000] px-1.5 py-1 align-top w-[92px] h-11">
                      {ganjil && (
                        <div className="flex flex-col h-9">
                          <span className="text-[10px] leading-none">{no}</span>
                          {hadirSah && b.ttd && (
                            <div
                              className="w-full flex-1 bg-contain bg-center bg-no-repeat"
                              style={{ backgroundImage: `url("${b.ttd}")` }}
                            />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Sub-kolom TTD Kanan (Nomor Genap: 2, 4, 6, ...) */}
                    <td className="border border-[#000000] px-1.5 py-1 align-top w-[92px] h-11">
                      {!ganjil && (
                        <div className="flex flex-col h-9">
                          <span className="text-[10px] leading-none">{no}</span>
                          {hadirSah && b.ttd && (
                            <div
                              className="w-full flex-1 bg-contain bg-center bg-no-repeat"
                              style={{ backgroundImage: `url("${b.ttd}")` }}
                            />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Blok Tanda Tangan Bawah (Kanan) */}
        <div className="mt-7 flex justify-end break-inside-avoid">
          <div className="w-56 text-[12px] leading-snug text-[#000000]">
            <p>{jabatanTtd},</p>
            <div className="h-16 my-1 flex items-center">
              {penandatanganDefault.ttd &&
              namaTtd.trim() === penandatanganDefault.nama.trim() ? (
                <div
                  className="w-36 h-14 bg-contain bg-left bg-no-repeat"
                  style={{
                    backgroundImage: `url("${penandatanganDefault.ttd}")`,
                  }}
                />
              ) : null}
            </div>
            <p className="font-semibold">{namaTtd}</p>
            {nimTtd.trim() && <p>NIM {nimTtd}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
