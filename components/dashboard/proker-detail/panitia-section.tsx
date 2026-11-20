// components/dashboard/proker-detail/panitia-section.tsx
"use client";

import Link from "next/link";
import { Users, Edit2, Trash2 } from "lucide-react";
import { getPeranBadge, type PanitiaItem, type ProkerData } from "./types";

interface Props {
  proker: ProkerData;
  isReadonly: boolean;
  isPending: boolean;
  onEditPanitia: (item: PanitiaItem) => void;
  onHapusPanitia: (id: number, nama: string) => void;
}

export function PanitiaSection({
  proker,
  isReadonly,
  isPending,
  onEditPanitia,
  onHapusPanitia,
}: Props) {
  if (proker.kepanitiaan.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl border border-dashed border-[#CBD5E1] bg-white">
        <Users className="w-10 h-10 text-slate-muted mx-auto mb-3" />
        <p className="text-sm font-semibold text-navy">
          Belum ada susunan panitia untuk proker ini
        </p>
        <p className="text-xs text-slate-muted mt-1">
          Tambahkan pengurus STO ke dalam kepanitiaan melalui halaman &quot;Kelola Susunan Panitia&quot;.
        </p>
        {!isReadonly && (
          <div className="mt-4">
            <Link
              href={`/dashboard/proker/${proker.id}/panitia`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-primary text-white text-xs font-semibold shadow-md shadow-secondary/25 transition-all"
            >
              <Users className="w-4 h-4" />
              Kelola Susunan Panitia
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto scrollbar-none" data-lenis-prevent>
        <table className="w-full text-left text-xs">
          <thead className="bg-surface text-slate-muted uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
            <tr>
              <th className="px-6 py-3.5">Nama & NIM STO</th>
              <th className="px-6 py-3.5">Peran Kepanitiaan</th>
              <th className="px-6 py-3.5">Divisi / Departemen</th>
              {!isReadonly && <th className="px-6 py-3.5 text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {proker.kepanitiaan.map((item) => {
              const badge = getPeranBadge(item.peran, item.divisiPanitia);
              const divisiLabel = item.sto.divisi || "Umum";

              return (
                <tr key={item.id} className="hover:bg-surface/70 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-semibold text-navy">{item.sto.nama}</div>
                        <div className="text-[11px] text-slate-muted">
                          {item.sto.nim} • {item.sto.emailGoogle}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-navy">
                    {divisiLabel}
                  </td>
                  {!isReadonly && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditPanitia(item)}
                          title="Ubah Peran Panitia"
                          className="p-1.5 rounded-lg text-slate-muted hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onHapusPanitia(item.id, item.sto.nama)}
                          disabled={isPending}
                          title="Hapus dari Panitia"
                          className="p-1.5 rounded-lg text-slate-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
