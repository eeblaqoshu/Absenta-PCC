// components/dashboard/adsek-table.tsx
// Tabel data akun Adsek / PI dengan aksi Tambah, Edit, Hapus (SweetAlert2), dan Pagination per 10 data
"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleAdsek } from "@prisma/client";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { konfirmasiHapus } from "@/lib/swal";
import { hapusAdsekAction } from "@/lib/actions/adsek";
import Swal from "sweetalert2";

export interface AdsekUserItem {
  id: number;
  nama: string;
  email: string;
  role: RoleAdsek;
  firebaseUid: string | null;
  terakhirLogin: string | null;
}

interface Props {
  data: AdsekUserItem[];
  currentUserId: number;
  currentUserRole: RoleAdsek;
}

const ITEMS_PER_PAGE = 10;

export function AdsekTable({ data, currentUserId, currentUserRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAdmin = currentUserRole === RoleAdsek.admin;

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("semua");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data berdasarkan kata kunci pencarian & filter role
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const q = search.trim().toLowerCase();
      const cocokCari =
        !q ||
        item.nama.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q);
      const cocokRole = filterRole === "semua" || item.role === filterRole;
      return cocokCari && cocokRole;
    });
  }, [data, search, filterRole]);

  // Hitung pagination per 10 data
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Statistik ringkas pengelola
  const totalAdmin = data.filter((d) => d.role === RoleAdsek.admin).length;
  const totalSekinti = data.filter(
    (d) =>
      d.role === RoleAdsek.sekretaris_inti ||
      d.role === RoleAdsek.sekretaris_umum,
  ).length;

  async function handleHapus(item: AdsekUserItem) {
    if (item.id === currentUserId) {
      await Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.",
        confirmButtonColor: "#1E6FE0",
        customClass: {
          popup: "rounded-2xl font-sans shadow-2xl border border-[#E2E8F0]",
          confirmButton:
            "rounded-xl text-xs font-semibold px-4 py-2.5 cursor-pointer",
        },
      });
      return;
    }

    const setuju = await konfirmasiHapus({
      judul: "Hapus Akun Pengelola?",
      pesan: `Apakah Anda yakin ingin menghapus akun "${item.nama}" (${item.email})? Tindakan ini tidak dapat dibatalkan.`,
      tombolHapus: "Ya, Hapus Akun",
      tombolBatal: "Batal",
    });

    if (!setuju) return;

    startTransition(async () => {
      const res = await hapusAdsekAction(item.id);
      if (res.sukses) {
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: res.pesan || "Akun pengelola berhasil dihapus.",
          timer: 2000,
          showConfirmButton: false,
          customClass: {
            popup: "rounded-2xl font-sans shadow-2xl border border-[#E2E8F0]",
          },
        });
        router.refresh();
      } else {
        await Swal.fire({
          icon: "error",
          title: "Gagal Menghapus",
          text: res.error?.pesan || "Terjadi kesalahan saat menghapus akun.",
          confirmButtonColor: "#1E6FE0",
          customClass: {
            popup: "rounded-2xl font-sans shadow-2xl border border-[#E2E8F0]",
            confirmButton:
              "rounded-xl text-xs font-semibold px-4 py-2.5 cursor-pointer",
          },
        });
      }
    });
  }

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-6">
      {/* Header Kartu: Judul, Ringkasan & Tombol Tambah Data Baru */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-secondary" />
            Daftar Akun Adsek / PI
          </h2>
          <p className="text-xs text-slate-muted mt-0.5">
            Kelola data kredensial, peran kepengurusan, dan hak akses pengelola
            sistem presensi.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/dashboard/profil/adsek/baru"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-white text-xs font-semibold hover:bg-secondary/90 shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Data Baru
          </Link>
        )}
      </div>

      {/* Baris Pencarian & Filter & Badge Statistik */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 w-auto">
          {/* Input Cari */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama atau email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#CBD5E1] bg-surface/50 text-xs text-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all"
            />
          </div>

          {/* Filter Role */}
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-[#CBD5E1] bg-surface/50 text-xs text-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all cursor-pointer"
          >
            <option value="semua">Semua Jabatan ({data.length})</option>
            <option value={RoleAdsek.admin}>Admin ({totalAdmin})</option>
            <option value={RoleAdsek.sekretaris_inti}>
              Sekretaris Inti ({totalSekinti})
            </option>
          </select>
        </div>
      </div>

      {/* Tabel Data Akun */}
      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-5 py-3.5 w-14 text-center">No</th>
              <th className="px-5 py-3.5">Nama</th>
              <th className="px-5 py-3.5">Jabatan</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Terakhir Login</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-slate-muted text-xs"
                >
                  {search || filterRole !== "semua"
                    ? "Tidak ada akun pengelola yang sesuai dengan filter pencarian."
                    : "Belum ada data akun pengelola."}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => {
                const isCurrentUser = item.id === currentUserId;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-surface/70 transition-colors ${
                      isCurrentUser ? "bg-sky-50/40" : ""
                    }`}
                  >
                    {/* No (Mengikuti urutan nomor pagination) */}
                    <td className="px-5 py-4 whitespace-nowrap text-center text-slate-muted font-medium">
                      {startIndex + index + 1}
                    </td>

                    {/* Nama */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy text-xs">
                          {item.nama}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-secondary border border-sky-200">
                            Anda
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Jabatan */}
                    <td className="px-5 py-4 whitespace-nowrap">{item.role}</td>

                    {/* Email */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono text-slate-muted text-xs">
                        {item.email}
                      </span>
                    </td>

                    {/* Terakhir Login */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {item.terakhirLogin ? (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <span className="font-medium text-xs">
                            {item.terakhirLogin}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Belum pernah login
                        </span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            {/* Tombol Edit (Icon Only) */}
                            <Link
                              href={`/dashboard/profil/adsek/${item.id}/edit`}
                              className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Edit data akun"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>

                            {/* Tombol Hapus (Icon Only) */}
                            {isCurrentUser ? (
                              <button
                                type="button"
                                disabled
                                className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed inline-flex items-center justify-center"
                                title="Akun aktif Anda saat ini tidak dapat dihapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleHapus(item)}
                                disabled={isPending}
                                className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                                title="Hapus akun pengelola ini"
                              >
                                {isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                        {!isAdmin && (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Kontrol Pagination (10 data per halaman) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-muted">
          Menampilkan{" "}
          <span className="font-semibold text-navy">
            {totalItems === 0 ? 0 : startIndex + 1}
          </span>{" "}
          sampai <span className="font-semibold text-navy">{endIndex}</span>{" "}
          dari <span className="font-semibold text-navy">{totalItems}</span>{" "}
          akun
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {/* Tombol Sebelumnya */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-medium text-slate-600 hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            {/* Nomor Halaman */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`min-w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  safeCurrentPage === page
                    ? "bg-secondary text-white shadow-sm"
                    : "border border-[#CBD5E1] text-slate-600 hover:bg-surface"
                }`}
              >
                {page}
              </button>
            ))}

            {/* Tombol Selanjutnya */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-medium text-slate-600 hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
