// components/dashboard/sto-manager/sto-table.tsx
"use client";

import { Edit2, Trash2 } from "lucide-react";
import type { StoItem } from "./types";

interface Props {
  data: StoItem[];
  isPending: boolean;
  onEdit: (item: StoItem) => void;
  onHapus: (id: number, nama: string) => void;
}

export function StoTable({ data, isPending, onEdit, onHapus }: Props) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-6 py-3.5">No</th>
              <th className="px-6 py-3.5">Nama & NIM</th>
              <th className="px-6 py-3.5">Email Google</th>
              <th className="px-6 py-3.5">Jabatan</th>
              <th className="px-6 py-3.5">Divisi</th>
              <th className="px-6 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-muted">
                  Tidak ada data pengurus STO yang sesuai.
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item.id} className="hover:bg-surface/70 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-muted font-medium">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-navy">{item.nama}</div>
                        <div className="text-[11px] text-slate-muted">{item.nim}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-muted text-[11px]">
                    {item.emailGoogle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-navy font-medium">
                    {item.jabatan || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full bg-surface text-primary border border-[#E2E8F0] text-[11px] font-medium">
                      {item.divisi || "Umum"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(item)}
                        title="Edit Pengurus"
                        className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onHapus(item.id, item.nama)}
                        disabled={isPending}
                        title="Hapus Pengurus"
                        className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
