// components/dashboard/proker-detail/panitia-csv-tab.tsx
"use client";

import { useState } from "react";
import { Upload, Download, Loader2 } from "lucide-react";
import {
  type StoOption,
  type ProkerData,
  type CsvBarisPanitia,
  isDivisiLitbang,
  isPeranLitbangPengawas,
} from "./types";
import { imporCsvPanitiaAction } from "@/lib/actions/kepanitiaan";

interface Props {
  proker: ProkerData;
  availableStos: StoOption[];
  onClose: () => void;
  setPesan: (p: { tipe: "sukses" | "error"; teks: string } | null) => void;
  isPending: boolean;
  startTransition: (cb: () => Promise<void>) => void;
}

export function PanitiaCsvTab({
  proker,
  availableStos,
  onClose,
  setPesan,
  isPending,
  startTransition,
}: Props) {
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
        } else if (
          isDivisiLitbang(matchedSto) &&
          !isPeranLitbangPengawas(peran, divisi)
        ) {
          valid = false;
          pesanError = `${matchedSto.nama} (Divisi Litbang) hanya dapat ditugaskan sebagai Litbang Pengawas`;
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
        onClose();
        setCsvFileName("");
        setCsvPreview([]);
        setCsvRawList([]);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-secondary/10 border border-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <p className="font-semibold text-primary">Format File CSV:</p>
          <p className="text-secondary text-[11px] mt-0.5">
            Kolom minimal: <span className="font-mono">NIM, Peran, Divisi_Panitia</span>
          </p>
        </div>
        <button
          type="button"
          onClick={unduhTemplateCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-secondary border border-secondary/30 font-semibold text-xs shadow-xs hover:bg-surface transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Unduh Template CSV
        </button>
      </div>

      <div className="border-2 border-dashed border-[#CBD5E1] rounded-2xl p-6 text-center hover:border-secondary transition-colors bg-white">
        <Upload className="w-8 h-8 text-slate-muted mx-auto mb-2" />
        <p className="text-xs font-semibold text-navy">
          Pilih berkas CSV dari komputer Anda
        </p>
        <p className="text-[11px] text-slate-muted mt-0.5">
          Mendukung separator koma (,) atau titik koma (;)
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvChange}
          className="mt-3 block w-full text-xs text-slate-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 cursor-pointer"
        />
      </div>

      {csvPreview.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-navy">
              Preview Data ({csvPreview.length} baris di {csvFileName}):
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-emerald-600 font-semibold">
                ✓ {csvPreview.filter((p) => p.valid).length} valid
              </span>
              {csvPreview.some((p) => !p.valid) && (
                <span className="text-rose-600 font-semibold">
                  ✗ {csvPreview.filter((p) => !p.valid).length} tidak valid
                </span>
              )}
            </div>
          </div>

          <div className="border border-[#E2E8F0] rounded-2xl overflow-x-auto max-h-48 text-[11px] bg-white">
            <table className="w-full text-left">
              <thead className="bg-surface sticky top-0 font-semibold text-slate-muted border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-3 py-2">NIM</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Peran</th>
                  <th className="px-3 py-2">Divisi</th>
                  <th className="px-3 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {csvPreview.map((row, i) => (
                  <tr
                    key={i}
                    className={row.valid ? "hover:bg-surface" : "bg-rose-50/50"}
                  >
                    <td className="px-3 py-1.5 font-mono text-navy font-semibold">
                      {row.nim}
                    </td>
                    <td className="px-3 py-1.5 text-navy font-medium">
                      {row.stoNama || "-"}
                    </td>
                    <td className="px-3 py-1.5 text-slate-muted">
                      {row.peran}
                    </td>
                    <td className="px-3 py-1.5 text-slate-muted">
                      {row.divisi}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {row.valid ? (
                        <span className="text-emerald-600 font-bold">Siap</span>
                      ) : (
                        <span
                          className="text-rose-600 font-bold"
                          title={row.pesanError}
                        >
                          {row.pesanError}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={
                isPending ||
                csvPreview.length === 0 ||
                csvPreview.filter((p) => p.valid).length === 0
              }
              onClick={handleProsesImporCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold disabled:opacity-50 shadow-md shadow-secondary/25 transition-all cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Impor {csvPreview.filter((p) => p.valid).length} Panitia Valid
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
