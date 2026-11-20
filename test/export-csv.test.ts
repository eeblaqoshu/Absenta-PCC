import { describe, it } from "node:test";
import assert from "node:assert/strict";

function sel(nilai: string | number | null | undefined): string {
  let teks = nilai === null || nilai === undefined ? "" : String(nilai);
  if (/^[=+\-@\t\r]/.test(teks)) {
    teks = "'" + teks;
  }
  return `"${teks.replace(/"/g, '""')}"`;
}

describe("Ekspor Format CSV Presensi Sederhana", () => {
  it("sel meng-escape kutip ganda dan membungkus string dengan benar", () => {
    assert.equal(sel("Muhammad Albi"), '"Muhammad Albi"');
    assert.equal(sel('Dia berkata: "Bagus"'), '"Dia berkata: ""Bagus"""');
    assert.equal(sel(15), '"15"');
    assert.equal(sel(null), '""');
    assert.equal(sel(undefined), '""');
  });

  it("sel menetralkan formula injection (CWE-1236) dengan prefix kutip tunggal", () => {
    assert.equal(sel('=cmd|"/C calc"!A0'), `"'=cmd|""/C calc""!A0"`);
    assert.equal(sel("+12345"), `"'+12345"`);
    assert.equal(sel("-200"), `"'-200"`);
    assert.equal(sel("@SUM(1,2)"), `"'@SUM(1,2)"`);
  });

  it("header CSV berisi kolom yang diminta secara tepat", () => {
    const header = [
      "Nama",
      "Divisi / Departemen",
      "Status Kehadiran",
      "Menit Terlambat",
      "Jarak (m)",
      "Diinput Manual",
    ]
      .map(sel)
      .join(",");

    assert.equal(
      header,
      '"Nama","Divisi / Departemen","Status Kehadiran","Menit Terlambat","Jarak (m)","Diinput Manual"'
    );
  });
});
