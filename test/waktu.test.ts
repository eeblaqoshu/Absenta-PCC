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

describe("lib/waktu", () => {
  describe("hitungMenitTerlambat & statusDariMenitTerlambat", () => {
    // Skenario: Jam mulai 12:00, Jam maksimal kedatangan 12:30
    const jamMaksimal = new Date("2026-11-21T12:30:00+07:00");

    it("menghasilkan 0 menit (hadir) jika scan di antara jam mulai dan jam maksimal kedatangan", () => {
      const scanTepat = new Date("2026-11-21T12:00:00+07:00");
      const scanTengah = new Date("2026-11-21T12:15:00+07:00");
      const scanBatasMaksimal = new Date("2026-11-21T12:30:00+07:00");

      assert.equal(hitungMenitTerlambat(jamMaksimal, scanTepat), 0);
      assert.equal(statusDariMenitTerlambat(hitungMenitTerlambat(jamMaksimal, scanTepat)), "hadir");

      assert.equal(hitungMenitTerlambat(jamMaksimal, scanTengah), 0);
      assert.equal(statusDariMenitTerlambat(hitungMenitTerlambat(jamMaksimal, scanTengah)), "hadir");

      assert.equal(hitungMenitTerlambat(jamMaksimal, scanBatasMaksimal), 0);
      assert.equal(statusDariMenitTerlambat(hitungMenitTerlambat(jamMaksimal, scanBatasMaksimal)), "hadir");
    });

    it("menghasilkan menit terlambat dan status terlambat jika scan lebih dari jam maksimal kedatangan", () => {
      const scanLewat5Menit = new Date("2026-11-21T12:35:00+07:00");
      const scanLewat30Menit = new Date("2026-11-21T13:00:00+07:00");

      const menit5 = hitungMenitTerlambat(jamMaksimal, scanLewat5Menit);
      assert.equal(menit5, 5);
      assert.equal(statusDariMenitTerlambat(menit5), "terlambat");

      const menit30 = hitungMenitTerlambat(jamMaksimal, scanLewat30Menit);
      assert.equal(menit30, 30);
      assert.equal(statusDariMenitTerlambat(menit30), "terlambat");
    });
  });

  describe("hitungStatusSesi", () => {
    const bukaAt = new Date("2026-11-21T12:00:00+07:00");
    const tutupAt = new Date("2026-11-21T12:30:00+07:00");

    it("mengembalikan belum_dibuka sebelum bukaAt", () => {
      const now = new Date("2026-11-21T11:59:00+07:00");
      assert.equal(hitungStatusSesi(bukaAt, tutupAt, now), "belum_dibuka");
    });

    it("mengembalikan berjalan saat sesi sudah dibuka pada hari pelaksanaan", () => {
      const nowTepat = new Date("2026-11-21T12:15:00+07:00");
      const nowTerlambat = new Date("2026-11-21T12:45:00+07:00");
      assert.equal(hitungStatusSesi(bukaAt, tutupAt, nowTepat), "berjalan");
      assert.equal(hitungStatusSesi(bukaAt, tutupAt, nowTerlambat), "berjalan");
    });

    it("mengembalikan ditutup setelah hari pelaksanaan sesi berakhir (hari berikutnya)", () => {
      const nowBesok = new Date("2026-11-22T08:00:00+07:00");
      assert.equal(hitungStatusSesi(bukaAt, tutupAt, nowBesok), "ditutup");
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
