// lib/swal.ts
import Swal from "sweetalert2";

/**
 * Menampilkan dialog konfirmasi hapus data dengan gaya tema PCC (Poppins, rounded, navy/rose).
 */
export async function konfirmasiHapus({
  judul = "Konfirmasi Hapus",
  pesan = "Data yang dihapus tidak dapat dipulihkan kembali.",
  tombolHapus = "Ya, Hapus Sekarang",
  tombolBatal = "Batal",
}: {
  judul?: string;
  pesan?: string;
  tombolHapus?: string;
  tombolBatal?: string;
} = {}): Promise<boolean> {
  const result = await Swal.fire({
    title: judul,
    text: pesan,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#E11D48", // rose-600
    cancelButtonColor: "#64748B", // slate-500
    confirmButtonText: tombolHapus,
    cancelButtonText: tombolBatal,
    reverseButtons: true,
    focusCancel: true,
    background: "#FFFFFF",
    color: "#0F172A",
    customClass: {
      popup: "rounded-2xl font-sans shadow-2xl border border-[#E2E8F0]",
      title: "text-base font-bold text-navy pt-2",
      htmlContainer: "text-xs text-slate-muted",
      confirmButton: "rounded-xl text-xs font-semibold px-4 py-2.5 shadow-md shadow-rose-600/20 cursor-pointer",
      cancelButton: "rounded-xl text-xs font-semibold px-4 py-2.5 cursor-pointer",
    },
  });

  return result.isConfirmed;
}

/**
 * Menampilkan dialog konfirmasi tindakan umum (misal tutup/aktifkan periode).
 */
export async function konfirmasiAksi({
  judul,
  pesan,
  icon = "question",
  tombolYa = "Ya, Lanjutkan",
  tombolBatal = "Batal",
  warnaKonfirmasi = "#1E6FE0",
}: {
  judul: string;
  pesan: string;
  icon?: "warning" | "question" | "info";
  tombolYa?: string;
  tombolBatal?: string;
  warnaKonfirmasi?: string;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: judul,
    text: pesan,
    icon,
    showCancelButton: true,
    confirmButtonColor: warnaKonfirmasi,
    cancelButtonColor: "#64748B",
    confirmButtonText: tombolYa,
    cancelButtonText: tombolBatal,
    reverseButtons: true,
    focusCancel: true,
    background: "#FFFFFF",
    color: "#0F172A",
    customClass: {
      popup: "rounded-2xl font-sans shadow-2xl border border-[#E2E8F0]",
      title: "text-base font-bold text-navy pt-2",
      htmlContainer: "text-xs text-slate-muted",
      confirmButton: "rounded-xl text-xs font-semibold px-4 py-2.5 shadow-md cursor-pointer",
      cancelButton: "rounded-xl text-xs font-semibold px-4 py-2.5 cursor-pointer",
    },
  });

  return result.isConfirmed;
}
