import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatLabelDivisi } from "../lib/divisi";
import { formatLabelBulan } from "../lib/rekap-poin";

describe("lib/divisi", () => {
  it("menyingkat kata depan Departemen dan Divisi", () => {
    assert.equal(formatLabelDivisi("Departemen Software"), "Dep. Software");
    assert.equal(formatLabelDivisi("Divisi Multimedia"), "Div. Multimedia");
    assert.equal(
      formatLabelDivisi("Divisi Penelitian dan Pengembangan"),
      "Div. Litbang"
    );
  });

  it("mempertahankan Pengurus Harian / Pengurus Inti dan prefix yang sudah singkat", () => {
    assert.equal(formatLabelDivisi("Pengurus Harian"), "Pengurus Harian");
    assert.equal(formatLabelDivisi("Pengurus Inti"), "Pengurus Inti");
    assert.equal(formatLabelDivisi("Dep. Hardware"), "Dep. Hardware");
    assert.equal(formatLabelDivisi(null), "Pengurus STO");
  });
});

describe("lib/rekap-poin formatLabelBulan", () => {
  it("memformat YYYY-MM menjadi nama bulan bahasa Indonesia", () => {
    assert.equal(formatLabelBulan("2026-01"), "Januari 2026");
    assert.equal(formatLabelBulan("2026-11"), "November 2026");
    assert.equal(formatLabelBulan("semua"), "Semua Bulan (Akumulasi Periode)");
  });
});
