import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hitungMenitTerlambat,
  statusDariMenitTerlambat,
  hitungStatusSesi,
  hitungStatusAgenda,
  jamDariWaktuAgenda,
  gabungTanggalDanWaktu,
} from "../lib/waktu";
import { BATAS_TERLAMBAT_MENIT } from "../lib/konstanta";

describe("lib/waktu", () => {
  describe("hitungMenitTerlambat & statusDariMenitTerlambat", () => {
    const bukaAt = new Date("2026-11-17T08:00:00+07:00");

    it("menghasilkan 0 menit jika scan sebelum atau tepat waktu buka", () => {
      const scanTepat = new Date("2026-11-17T08:00:00+07:00");
      const scanAwal = new Date("2026-11-17T07:55:00+07:00");
      assert.equal(hitungMenitTerlambat(bukaAt, scanTepat), 0);
      assert.equal(hitungMenitTerlambat(bukaAt, scanAwal), 0);
    });

    it("menghasilkan status hadir jika scan <= BATAS_TERLAMBAT_MENIT (15 menit)", () => {
      const scan15Menit = new Date("2026-11-17T08:15:00+07:00");
      const menit = hitungMenitTerlambat(bukaAt, scan15Menit);
      assert.equal(menit, 15);
      assert.equal(statusDariMenitTerlambat(menit), "hadir");
    });

    it("menghasilkan status terlambat jika scan > BATAS_TERLAMBAT_MENIT", () => {
      const scan16Menit = new Date("2026-11-17T08:16:00+07:00");
      const menit = hitungMenitTerlambat(bukaAt, scan16Menit);
      assert.equal(menit, 16);
      assert.equal(statusDariMenitTerlambat(menit), "terlambat");
    });
  });

  describe("hitungStatusSesi", () => {
    const bukaAt = new Date("2026-11-17T08:00:00+07:00");
    const tutupAt = new Date("2026-11-17T10:00:00+07:00");

    it("mengembalikan belum_dibuka sebelum bukaAt", () => {
      const now = new Date("2026-11-17T07:59:00+07:00");
      assert.equal(hitungStatusSesi(bukaAt, tutupAt, now), "belum_dibuka");
    });

    it("mengembalikan berjalan di antara bukaAt dan tutupAt", () => {
      const now = new Date("2026-11-17T08:30:00+07:00");
      assert.equal(hitungStatusSesi(bukaAt, tutupAt, now), "berjalan");
    });

    it("mengembalikan ditutup setelah tutupAt", () => {
      const now = new Date("2026-11-17T10:01:00+07:00");
      assert.equal(hitungStatusSesi(bukaAt, tutupAt, now), "ditutup");
    });
  });

  describe("hitungStatusAgenda", () => {
    const tglMulai = new Date("2026-11-17T00:00:00Z");
    const waktuMulai = new Date("1970-01-01T09:00:00Z"); // 09:00 WIB
    const tglSelesai = new Date("2026-11-17T00:00:00Z");

    it("mengembalikan akan_datang sebelum jam mulai pada hari pelaksanaan", () => {
      const now = new Date("2026-11-17T08:30:00+07:00");
      assert.equal(hitungStatusAgenda(tglMulai, waktuMulai, tglSelesai, now), "akan_datang");
    });

    it("mengembalikan sedang_berlangsung saat hari pelaksanaan mulai", () => {
      const now = new Date("2026-11-17T09:05:00+07:00");
      assert.equal(hitungStatusAgenda(tglMulai, waktuMulai, tglSelesai, now), "sedang_berlangsung");
    });

    it("mengembalikan selesai setelah hari pelaksanaan berakhir (lewat 23:59 WIB)", () => {
      const now = new Date("2026-11-18T00:05:00+07:00");
      assert.equal(hitungStatusAgenda(tglMulai, waktuMulai, tglSelesai, now), "selesai");
    });
  });

  describe("jamDariWaktuAgenda", () => {
    it("membaca nilai TIME UTC apa adanya sebagai HH:mm WIB", () => {
      const waktu = new Date("1970-01-01T13:45:00Z");
      assert.equal(jamDariWaktuAgenda(waktu), "13:45");
    });
  });
});
