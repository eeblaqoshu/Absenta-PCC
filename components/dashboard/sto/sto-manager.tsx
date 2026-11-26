// components/dashboard/sto-manager.tsx
"use client";

import { useState, useTransition, useMemo } from "react";
import {
  tambahStoAction,
  ubahStoAction,
  hapusStoAction,
  imporCsvStoAction,
  type CsvBarisSto,
} from "./actions";
import { konfirmasiHapus } from "@/lib/swal";
import {
  Plus,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from "lucide-react";
import type { StoItem } from "./types";
import { ModalStoForm } from "./modal-sto-form";
import { ModalStoCsv } from "./modal-sto-csv";
import { StoTable } from "./sto-table";

// Re-export StoItem untuk backwards-compatibility
export type { StoItem };

export function StoManager({
  initialSto,
  namaPeriode,
  isAdmin = true,
}: {
  initialSto: StoItem[];
  namaPeriode: string;
  isAdmin?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [pesan, setPesan] = useState<{
    tipe: "sukses" | "error";
    teks: string;
  } | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterDivisi, setFilterDivisi] = useState("all");

  // Modals
  const [modalTambahBuka, setModalTambahBuka] = useState(false);
  const [modalEditBuka, setModalEditBuka] = useState(false);
  const [modalCsvBuka, setModalCsvBuka] = useState(false);
  const [stoSedangDiedit, setStoSedangDiedit] = useState<StoItem | null>(null);

  // Form State (Tambah / Edit)
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [emailGoogle, setEmailGoogle] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [divisi, setDivisi] = useState("");
  const [ttd, setTtd] = useState<string | null>(null);

  // CSV Import State
  const [csvPreview, setCsvPreview] = useState<CsvBarisSto[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvHasil, setCsvHasil] = useState<{
    totalBerhasil: number;
    totalGagal: number;
    pesanGagal: string[];
  } | null>(null);

  // List of unique divisions
  const divisiList = useMemo(() => {
    const set = new Set<string>();
    initialSto.forEach((s) => {
      if (s.divisi) set.add(s.divisi);
    });
    return Array.from(set).sort();
  }, [initialSto]);

  // Filtered STO
  const filteredSto = useMemo(() => {
    return initialSto.filter((item) => {
      const matchSearch =
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        item.nim.toLowerCase().includes(search.toLowerCase()) ||
        item.emailGoogle.toLowerCase().includes(search.toLowerCase());
      const matchDivisi =
        filterDivisi === "all" ||
        item.divisi?.toLowerCase() === filterDivisi.toLowerCase();
      return matchSearch && matchDivisi;
    });
  }, [initialSto, search, filterDivisi]);

  const resetForm = () => {
    setNama("");
    setNim("");
    setEmailGoogle("");
    setJabatan("");
    setDivisi("");
    setTtd(null);
    setStoSedangDiedit(null);
  };

  const handleOpenEdit = (item: StoItem) => {
    setStoSedangDiedit(item);
    setNama(item.nama);
    setNim(item.nim);
    setEmailGoogle(item.emailGoogle);
    setJabatan(item.jabatan || "");
    setDivisi(item.divisi || "");
    setTtd(item.ttd || null);
    setModalEditBuka(true);
  };

  const handleSubmitTambah = (e: React.FormEvent) => {
    e.preventDefault();
    setPesan(null);

    const formData = new FormData();
    formData.append("nama", nama);
    formData.append("nim", nim);
    formData.append("emailGoogle", emailGoogle);
    formData.append("jabatan", jabatan);
    formData.append("divisi", divisi);
    if (ttd && ttd !== "__HAPUS__") {
      formData.append("ttd", ttd);
    }

    startTransition(async () => {
      const res = await tambahStoAction(null, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalTambahBuka(false);
        resetForm();
      }
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoSedangDiedit) return;
    setPesan(null);

    const formData = new FormData();
    formData.append("nama", nama);
    formData.append("nim", nim);
    formData.append("emailGoogle", emailGoogle);
    formData.append("jabatan", jabatan);
    formData.append("divisi", divisi);
    if (ttd === "__HAPUS__") {
      formData.append("ttd", "__HAPUS__");
    } else if (ttd && ttd !== stoSedangDiedit.ttd) {
      formData.append("ttd", ttd);
    }

    startTransition(async () => {
      const res = await ubahStoAction(stoSedangDiedit.id, formData);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
        setModalEditBuka(false);
        resetForm();
      }
    });
  };

  const handleHapusSto = async (id: number, namaSto: string) => {
    const setuju = await konfirmasiHapus({
      judul: "Hapus Pengurus STO?",
      pesan: `Anda yakin ingin menghapus data pengurus "${namaSto}"? Data kepanitiaan terkait akan ikut terhapus.`,
      tombolHapus: "Ya, Hapus Pengurus",
    });
    if (!setuju) return;

    startTransition(async () => {
      const res = await hapusStoAction(id);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setPesan({ tipe: "sukses", teks: res.pesan });
      }
    });
  };

  // CSV File Handler
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvHasil(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert("File CSV tidak memiliki data baris.");
        return;
      }

      const delimiter = lines[0].includes(";") ? ";" : ",";
      const headers = lines[0]
        .split(delimiter)
        .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

      const namaIdx = headers.findIndex((h) => h.includes("nama"));
      const nimIdx = headers.findIndex((h) => h.includes("nim"));
      const emailIdx = headers.findIndex((h) => h.includes("email"));
      const jabatanIdx = headers.findIndex((h) => h.includes("jabatan"));
      const divisiIdx = headers.findIndex((h) => h.includes("divisi"));

      const parsedRows: CsvBarisSto[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(delimiter)
          .map((c) => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length < 3) continue;

        parsedRows.push({
          nama: namaIdx !== -1 ? cols[namaIdx] || "" : cols[0] || "",
          nim: nimIdx !== -1 ? cols[nimIdx] || "" : cols[1] || "",
          email: emailIdx !== -1 ? cols[emailIdx] || "" : cols[2] || "",
          jabatan: jabatanIdx !== -1 ? cols[jabatanIdx] : cols[3] || undefined,
          divisi: divisiIdx !== -1 ? cols[divisiIdx] : cols[4] || undefined,
        });
      }

      setCsvPreview(parsedRows);
    };

    reader.readAsText(file);
  };

  const handleProsesImporCsv = () => {
    if (csvPreview.length === 0) return;

    startTransition(async () => {
      const res = await imporCsvStoAction(csvPreview);
      if (res.error) {
        setPesan({ tipe: "error", teks: res.error.pesan });
      } else {
        setCsvHasil({
          totalBerhasil: res.totalBerhasil || 0,
          totalGagal: res.totalGagal || 0,
          pesanGagal: res.pesanGagal || [],
        });
        setPesan({
          tipe: "sukses",
          teks: `Impor selesai: ${res.totalBerhasil} berhasil, ${res.totalGagal} dilewati/gagal.`,
        });
      }
    });
  };

  const downloadSampleCsv = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Nama,NIM,Email,Jabatan,Divisi\n" +
      "Budi Santoso,3.34.23.0.01,budi@mhs.polines.ac.id,Ketua Umum,Pengurus Inti\n" +
      "Siti Rahma,3.34.23.0.02,siti@mhs.polines.ac.id,Staff,Divisi Litbang\n" +
      "Andi Prasetyo,3.34.23.0.03,andi@mhs.polines.ac.id,PJ Acara,Divisi Humas";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_sto_presensi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSudahTtd = useMemo(
    () => initialSto.filter((s) => Boolean(s.ttd)).length,
    [initialSto],
  );

  return (
    <div className="space-y-6">
      {/* Header Banner Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-secondary whitespace-nowrap">
                {namaPeriode}
              </span>
            </div>
            <span className="text-xs text-slate-muted">â€¢</span>
            <span className="text-xs font-medium text-slate-muted">
              TTD Digital: {totalSudahTtd}/{initialSto.length} STO
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            Data Kepengurusan STO
          </h2>
          <p className="text-xs text-slate-muted mt-1 leading-relaxed">
            Kelola master data pengurus organisasi, tanda tangan digital (TTD)
            per STO, serta impor CSV.
          </p>
        </div>

        {isAdmin ? (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                setCsvPreview([]);
                setCsvHasil(null);
                setCsvFileName("");
                setModalCsvBuka(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-navy text-xs font-semibold hover:bg-surface shadow-sm transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-secondary" />
              Impor CSV
            </button>

            <button
              type="button"
              suppressHydrationWarning
              onClick={() => {
                resetForm();
                setModalTambahBuka(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah STO
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-[#E2E8F0] text-slate-muted text-xs font-semibold shrink-0 self-start sm:self-auto">
            <Lock className="w-3.5 h-3.5 text-secondary" />
            Mode Baca (Kelola &amp; Upload TTD Khusus Admin)
          </span>
        )}
      </div>

      {/* Alert Notification */}
      {pesan && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            pesan.tipe === "sukses"
              ? "bg-accent/15 border-accent/40 text-primary"
              : "bg-highlight/15 border-highlight/40 text-primary"
          }`}
        >
          {pesan.tipe === "sukses" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-secondary" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-highlight" />
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-muted" />
          <input
            type="text"
            suppressHydrationWarning
            placeholder="Cari nama, NIM, atau email pengurus..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy placeholder:text-slate-muted focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
          />
        </div>

        {divisiList.length > 0 && (
          <select
            suppressHydrationWarning
            value={filterDivisi}
            onChange={(e) => setFilterDivisi(e.target.value)}
            className="w-full sm:w-48 px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary cursor-pointer"
          >
            <option value="all">Semua Divisi</option>
            {divisiList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table STO */}
      <StoTable
        data={filteredSto}
        isPending={isPending}
        isAdmin={isAdmin}
        onEdit={handleOpenEdit}
        onHapus={handleHapusSto}
      />

      {/* Modal Tambah / Edit STO */}
      {isAdmin && (
        <ModalStoForm
          isOpen={modalTambahBuka || modalEditBuka}
          isEdit={modalEditBuka}
          isPending={isPending}
          stoSedangDiedit={stoSedangDiedit}
          nama={nama}
          nim={nim}
          emailGoogle={emailGoogle}
          jabatan={jabatan}
          divisi={divisi}
          ttd={ttd}
          setNama={setNama}
          setNim={setNim}
          setEmailGoogle={setEmailGoogle}
          setJabatan={setJabatan}
          setDivisi={setDivisi}
          setTtd={setTtd}
          onClose={() => {
            setModalTambahBuka(false);
            setModalEditBuka(false);
            resetForm();
          }}
          onSubmit={modalTambahBuka ? handleSubmitTambah : handleSubmitEdit}
        />
      )}

      {/* Modal Impor CSV */}
      {isAdmin && (
        <ModalStoCsv
          isOpen={modalCsvBuka}
          isPending={isPending}
          csvFileName={csvFileName}
          csvPreview={csvPreview}
          csvHasil={csvHasil}
          onClose={() => setModalCsvBuka(false)}
          onFileChange={handleCsvFileChange}
          onProsesImpor={handleProsesImporCsv}
          onDownloadTemplate={downloadSampleCsv}
        />
      )}
    </div>
  );
}
