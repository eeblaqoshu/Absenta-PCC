// components/dashboard/sto-manager/sto-table.tsx
"use client";

import { Edit2, Trash2, Upload } from "lucide-react";
import { formatLabelDivisi } from "@/lib/divisi";
import type { StoItem } from "./types";

interface Props {
  data: StoItem[];
  isPending: boolean;
  isAdmin?: boolean;
  onEdit: (item: StoItem) => void;
  onHapus: (id: number, nama: string) => void;
}

export function StoTable({
  data,
  isPending,
  isAdmin = true,
  onEdit,
  onHapus,
}: Props) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-5 py-3.5">No</th>
              <th className="px-5 py-3.5">Nama &amp; NIM</th>
              <th className="px-5 py-3.5">Email Google</th>
              <th className="px-5 py-3.5">Jabatan</th>
              <th className="px-5 py-3.5">Div/Dep</th>
              <th className="px-5 py-3.5">TTD Digital</th>
              {isAdmin && <th className="px-5 py-3.5 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-6 py-12 text-center text-slate-muted"
                >
                  Tidak ada data pengurus STO yang sesuai.
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={item.id}
                  className="hover:bg-surface/70 transition-colors"
                >
                  <td className="px-5 py-4 whitespace-nowrap text-slate-muted font-medium">
                    {index + 1}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-semibold text-navy">{item.nama}</div>
                    <div className="text-[11px] text-slate-muted">
                      {item.nim}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-slate-muted text-[11px]">
                    {item.emailGoogle}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-navy font-medium">
                    {item.jabatan || "-"}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className="px-2.5 py-1 rounded-full bg-surface text-primary border border-[#E2E8F0] text-[11px] font-medium"
                      title={item.divisi || "Umum"}
                    >
                      {formatLabelDivisi(item.divisi)}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {item.ttd ? (
                      <div
                        role="img"
                        aria-label={`TTD ${item.nama}`}
                        className="w-28 h-11 p-1.5 rounded-xl bg-surface border border-[#E2E8F0] overflow-hidden"
                      >
                        <div
                          className="w-full h-full bg-contain bg-center bg-no-repeat"
                          style={{ backgroundImage: `url("${item.ttd}")` }}
                        />
                      </div>
                    ) : isAdmin ? (
                      <button
                        type="button"
                        suppressHydrationWarning
                        onClick={() => onEdit(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#CBD5E1] text-[11px] font-medium text-slate-muted hover:border-secondary hover:text-secondary transition-colors cursor-pointer"
                        title="Tambahkan TTD digital pengurus ini"
                      >
                        <Upload className="w-3 h-3" />
                        Upload TTD
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-muted">
                        Belum ada
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => onEdit(item)}
                          title="Edit Pengurus & TTD"
                          className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          suppressHydrationWarning
                          onClick={() => onHapus(item.id, item.nama)}
                          disabled={isPending}
                          title="Hapus Pengurus"
                          className="p-1.5 rounded-lg text-slate-muted hover:text-primary hover:bg-highlight/20 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
