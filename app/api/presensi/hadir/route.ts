// app/api/presensi/hadir/route.ts
// Daftar kehadiran langsung (live feed) untuk adsek.
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "adsek" || !session.adsek) {
    return NextResponse.json(
      {
        error: {
          kode: "AKSES_DITOLAK",
          pesan: "Hanya adsek yang dapat melihat daftar hadir",
        },
      },
      { status: 403 },
    );
  }

  const sesiId = Number(req.nextUrl.searchParams.get("sesiId"));
  if (!Number.isInteger(sesiId) || sesiId <= 0) {
    return NextResponse.json(
      {
        error: {
          kode: "VALIDASI_GAGAL",
          pesan: "Parameter sesiId tidak valid",
        },
      },
      { status: 400 },
    );
  }

  const sesi = await prisma.sesiPresensi.findUnique({
    where: { id: sesiId },
    select: { id: true, agendaId: true, agenda: { select: { radiusM: true } } },
  });

  if (!sesi) {
    return NextResponse.json(
      {
        error: {
          kode: "TIDAK_DITEMUKAN",
          pesan: "Sesi presensi tidak ditemukan",
        },
      },
      { status: 404 },
    );
  }

  const daftar = await prisma.presensi.findMany({
    where: { sesiId },
    orderBy: { waktuScan: "desc" },
    select: {
      id: true,
      waktuScan: true,
      status: true,
      menitTerlambat: true,
      manual: true,
      jarakM: true,
      diLuarRadius: true,
      statusVerifikasi: true,
      sto: { select: { id: true, nama: true, nim: true, divisi: true } },
    },
  });

  // Presensi yang ditolak adsek tidak dihitung sebagai kehadiran.
  const dihitung = daftar.filter((p) => p.statusVerifikasi !== "ditolak");

  const jumlahHadir = dihitung.filter((p) => p.status === "hadir").length;
  const jumlahTerlambat = dihitung.filter(
    (p) => p.status === "terlambat",
  ).length;
  const perluVerifikasi = daftar.filter(
    (p) => p.statusVerifikasi === "menunggu",
  ).length;

  return NextResponse.json(
    {
      sukses: true,
      sesiId,
      radiusM: sesi.agenda.radiusM ?? null,
      ringkasan: {
        total: daftar.length,
        hadir: jumlahHadir,
        terlambat: jumlahTerlambat,
        perluVerifikasi,
      },
      daftar,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
