// components/dashboard/adsek/adsek-table.tsx
// Tabel data akun Adsek / Admin dengan tata letak & visual identik dengan halaman Data STO
"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RoleAdsek } from "@prisma/client";
import {
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
  namaPeriode?: string;
}

const ITEMS_PER_PAGE = 10;

function formatRoleLabel(role: RoleAdsek): string {
  switch (role) {
    case RoleAdsek.admin:
      return "Admin";
    case RoleAdsek.sekretaris_inti:
      return "Sekretaris Inti";
    case RoleAdsek.sekretaris_umum:
      return "Sekretaris Umum";
    default:
      return role;
  }
}

export function AdsekTable({
  data,
  currentUserId,
  currentUserRole,
  namaPeriode = "Tidak Ada Periode Aktif",
}: Props) {
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
    <div className="space-y-6">
      {/* Header Banner Card (Identik dengan format STO) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
            <div className="inline-flex items-center gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-secondary whitespace-nowrap">
                {namaPeriode}
              </span>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
            Data Admin
          </h2>
          <p className="text-xs text-slate-muted mt-1 leading-relaxed">
            Kelola data kredensial, peran kepengurusan, dan hak akses akun administrator serta sekretaris organisasi.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <Link
              href="/dashboard/profil/adsek/baru"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Data Baru
            </Link>
          </div>
        )}
      </div>

      {/* Filter and Search Bar (Identik dengan STO di luar card tabel) */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-muted" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy placeholder:text-slate-muted focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
          />
        </div>

        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full sm:w-56 px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary cursor-pointer"
        >
          <option value="semua">Semua Jabatan</option>
          <option value={RoleAdsek.admin}>Admin</option>
          <option value={RoleAdsek.sekretaris_inti}>
            Sekretaris Inti
          </option>
        </select>
      </div>

      {/* Table Card (Identik dengan StoTable) */}
      <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
              <tr>
                <th className="px-5 py-3.5 w-14">No</th>
                <th className="px-5 py-3.5">Nama</th>
                <th className="px-5 py-3.5">Jabatan</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Terakhir Login</th>
                {isAdmin && <th className="px-5 py-3.5 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-6 py-12 text-center text-slate-muted"
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
                      className="hover:bg-surface/70 transition-colors"
                    >
                      {/* No */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-muted font-medium">
                        {startIndex + index + 1}
                      </td>

                      {/* Nama */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-navy">
                            {item.nama}
                          </span>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-secondary border border-accent/40 text-[10px] font-bold">
                              Anda
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Jabatan */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full bg-surface text-primary border border-[#E2E8F0] text-[11px] font-medium">
                          {formatRoleLabel(item.role)}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-muted text-[11px]">
                        {item.email}
                      </td>

                      {/* Terakhir Login */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.terakhirLogin ? (
                          <span className="text-navy text-[11px] font-medium">
                            {item.terakhirLogin}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-muted italic">
                            Belum pernah login
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      {isAdmin && (
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/dashboard/profil/adsek/${item.id}/edit`}
                              className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Edit data akun"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>

                            {isCurrentUser ? (
                              <span
                                className="p-1.5 rounded-lg text-slate-300 inline-flex items-center justify-center cursor-not-allowed"
                                title="Akun aktif Anda saat ini tidak dapat dihapus"
                              >
                                <Trash2 className="w-3.5 h-3.5 opacity-40" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleHapus(item)}
                                disabled={isPending}
                                className="p-1.5 rounded-lg text-slate-muted hover:text-primary hover:bg-highlight/20 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
                                title="Hapus akun pengelola ini"
                              >
                                {isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Kontrol Pagination (10 data per halaman di footer kartu tabel) */}
        <div className="border-t border-[#E2E8F0] px-5 py-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-medium text-slate-600 hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

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
    </div>
  );
}
