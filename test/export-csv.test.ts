import { describe, it } from "node:test";
import assert from "node:assert/strict";

function sel(nilai: string | number | null | undefined): string {
  const teks = nilai === null || nilai === undefined ? "" : String(nilai);
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
