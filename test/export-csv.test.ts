import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HEADER_TABEL_CSV, selCsv, susunCsvKehadiran } from "../lib/csv-presensi";
import { JenisAgenda, TargetPeserta } from "@prisma/client";

describe("Ekspor Format CSV Presensi Terstruktur", () => {
  it("selCsv meng-escape kutip ganda dan membungkus string dengan benar", () => {
    assert.equal(selCsv("Muhammad Albi"), '"Muhammad Albi"');
    assert.equal(selCsv('Dia berkata: "Bagus"'), '"Dia berkata: ""Bagus"""');
    assert.equal(selCsv(15), '"15"');
    assert.equal(selCsv(null), '""');
    assert.equal(selCsv(undefined), '""');
  });

  it("selCsv menetralkan formula injection (CWE-1236) dengan prefix kutip tunggal", () => {
    assert.equal(selCsv('=cmd|"/C calc"!A0'), `"'=cmd|""/C calc""!A0"`);
    assert.equal(selCsv("+12345"), `"'+12345"`);
    assert.equal(selCsv("-200"), `"'-200"`);
    assert.equal(selCsv("@SUM(1,2)"), `"'@SUM(1,2)"`);
  });

  it("susunCsvKehadiran menghasilkan blok kop, tabel peserta, dan ringkasan yang rapi", () => {
    const csv = susunCsvKehadiran({
      sesiId: 1,
      agendaId: 10,
      judulAgenda: "Hari-H National IT Festival",
      jenisAgenda: JenisAgenda.hari_h,
      tglPelaksanaan: "2026-11-24T00:00:00.000Z",
      tglSelesai: null,
      waktuPelaksanaan: "08:00",
      lokasiNama: "Auditorium Polines",
      targetPeserta: TargetPeserta.semua_panitia_sto,
      namaProker: "PCC National IT Festival 2026",
      namaProkerId: 2,
      periodeNama: "Periode Kepengurusan 2026/2027",
      bukaAt: "2026-11-24T01:00:00.000Z",
      tutupAt: "2026-11-24T08:00:00.000Z",
      radiusM: 500,
      sesiSudahDitutup: true,
      ringkasan: {
        total: 2,
        hadir: 1,
        terlambat: 0,
        izin: 0,
        izinMenunggu: 0,
        alpa: 1,
        ditolak: 0,
        perluVerifikasi: 0,
      },
      baris: [
        {
          stoId: 1,
          nama: "Labib Fauzi",
          nim: "3.34.25.1.14",
          divisi: "Departemen Software",
          jabatan: "Staff",
          peran: null,
          divisiPanitia: "Divisi Acara",
          ttd: "data:image/png;base64,iVBORw0KGgo=",
          presensiId: 100,
          status: "hadir",
          waktuScan: "2026-11-24T07:53:00.000Z",
          menitTerlambat: 0,
          jarakM: 12,
          diLuarRadius: false,
          statusVerifikasi: "diterima",
          manual: false,
          izin: null,
          statusKehadiran: "hadir",
          poin: 2,
        },
        {
          stoId: 2,
          nama: "Budi Santoso",
          nim: "3.34.22.0.02",
          divisi: "Web Development",
          jabatan: "Koordinator",
          peran: null,
          divisiPanitia: null,
          ttd: null,
          presensiId: null,
          status: null,
          waktuScan: null,
          menitTerlambat: 0,
          jarakM: null,
          diLuarRadius: false,
          statusVerifikasi: null,
          manual: false,
          izin: null,
          statusKehadiran: "alpa",
          poin: -2,
        },
      ],
    });

    assert.ok(csv.startsWith("\uFEFFsep=,\r\n"));
    assert.ok(csv.includes('"DAFTAR HADIR KEGIATAN UKM PCC"'));
    assert.ok(csv.includes(HEADER_TABEL_CSV.map(selCsv).join(",")));
    assert.ok(csv.includes('"Dep. Software"'));
    assert.ok(csv.includes('"TTD Terlampir"'));
    assert.ok(csv.includes('"RINGKASAN KEHADIRAN"'));
  });
});
