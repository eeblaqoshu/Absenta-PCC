import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PeranPanitia } from "@prisma/client";
import {
  isJabatanAdminOrSekum,
  getKategoriJabatanPi,
  validasiKesesuaianJabatanPi,
} from "../components/dashboard/proker/types";

describe("Validasi Kepanitiaan: Larangan Admin & Sekum serta Kesesuaian Jabatan PI", () => {
  describe("isJabatanAdminOrSekum", () => {
    it("mendeteksi jabatan Admin dan role adsek admin sebagai terlarang masuk panitia", () => {
      const stoAdmin1 = { nama: "Admin", jabatan: "Admin", divisi: "Pengurus Harian" };
      assert.equal(isJabatanAdminOrSekum(stoAdmin1).dilarang, true);

      const stoAdmin2 = { nama: "Albi", jabatan: "Ketua Umum", roleAdsek: "admin" };
      assert.equal(isJabatanAdminOrSekum(stoAdmin2).dilarang, true);

      const stoKetum = { nama: "Ketum", jabatan: "Ketua Umum", divisi: "Pengurus Harian" };
      assert.equal(isJabatanAdminOrSekum(stoKetum).dilarang, true);
    });

    it("mendeteksi jabatan Sekretaris Umum dan role adsek sekretaris_umum sebagai terlarang masuk panitia", () => {
      const stoSekum = { nama: "Citra", jabatan: "Sekretaris Umum", divisi: "Pengurus Harian" };
      assert.equal(isJabatanAdminOrSekum(stoSekum).dilarang, true);

      const stoSekumRole = { nama: "Dian", roleAdsek: "sekretaris_umum" };
      assert.equal(isJabatanAdminOrSekum(stoSekumRole).dilarang, true);

      const stoSekumSingkat = { nama: "Eko", jabatan: "Sekum", divisi: "BPH" };
      assert.equal(isJabatanAdminOrSekum(stoSekumSingkat).dilarang, true);
    });

    it("tidak melarang jabatan non-Admin dan non-Sekum", () => {
      const stoBendum = { nama: "Budi", jabatan: "Bendahara Umum", divisi: "Pengurus Harian" };
      assert.equal(isJabatanAdminOrSekum(stoBendum).dilarang, false);

      const stoSekinti = { nama: "Fani", jabatan: "Sekretaris Inti", divisi: "Pengurus Harian" };
      assert.equal(isJabatanAdminOrSekum(stoSekinti).dilarang, false);

      const stoStaff = { nama: "Gita", jabatan: "Staff Sie Acara", divisi: "Acara" };
      assert.equal(isJabatanAdminOrSekum(stoStaff).dilarang, false);

      assert.equal(isJabatanAdminOrSekum(null).dilarang, false);
    });
  });

  describe("validasiKesesuaianJabatanPi", () => {
    const admin = {
      nama: "Administrator",
      jabatan: "Admin",
      roleAdsek: "admin",
    };
    const sekum = {
      nama: "Citra Sekum",
      jabatan: "Sekretaris Umum",
      divisi: "Pengurus Harian",
    };
    const bendum = {
      nama: "Dewi Bendahara",
      jabatan: "Bendahara Umum",
      divisi: "Pengurus Harian",
    };
    const sekinti = {
      nama: "Rina Sekre Inti",
      jabatan: "Sekretaris Inti",
      divisi: "Pengurus Harian",
    };
    const staf = {
      nama: "Budi Santoso",
      jabatan: "Staff Sie Acara",
      divisi: "Acara",
    };

    it("Admin TIDAK BOLEH ditambahkan ke kepanitiaan pada peran apa pun", () => {
      const cekKetua = validasiKesesuaianJabatanPi(admin, "Ketua Pelaksana");
      assert.equal(cekKetua.valid, false);
      assert.match(cekKetua.pesanError || "", /tidak boleh ditambahkan ke dalam kepanitiaan/);

      const cekSekre = validasiKesesuaianJabatanPi(admin, "Sekretaris Pelaksana");
      assert.equal(cekSekre.valid, false);

      const cekBend = validasiKesesuaianJabatanPi(admin, "Bendahara Pelaksana");
      assert.equal(cekBend.valid, false);

      const cekPj = validasiKesesuaianJabatanPi(admin, "pj_sie_acara");
      assert.equal(cekPj.valid, false);

      const cekAnggota = validasiKesesuaianJabatanPi(admin, "Anggota");
      assert.equal(cekAnggota.valid, false);
    });

    it("Sekretaris Umum (Sekum) TIDAK BOLEH ditambahkan ke kepanitiaan pada peran apa pun", () => {
      const cekSekreInti = validasiKesesuaianJabatanPi(sekum, "Sekretaris Inti");
      assert.equal(cekSekreInti.valid, false);
      assert.match(cekSekreInti.pesanError || "", /tidak boleh ditambahkan ke dalam kepanitiaan/);

      const cekSekrePel = validasiKesesuaianJabatanPi(sekum, "Sekretaris Pelaksana");
      assert.equal(cekSekrePel.valid, false);

      const cekKetua = validasiKesesuaianJabatanPi(sekum, "Ketua Pelaksana");
      assert.equal(cekKetua.valid, false);

      const cekBend = validasiKesesuaianJabatanPi(sekum, "Bendahara Pelaksana");
      assert.equal(cekBend.valid, false);

      const cekPj = validasiKesesuaianJabatanPi(sekum, "pj_sie_acara");
      assert.equal(cekPj.valid, false);

      const cekAnggota = validasiKesesuaianJabatanPi(sekum, "Anggota");
      assert.equal(cekAnggota.valid, false);
    });

    it("Bendahara Umum hanya boleh ditugaskan sebagai peran Bendahara", () => {
      assert.equal(validasiKesesuaianJabatanPi(bendum, "Bendahara Inti").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(bendum, "Bendahara Pelaksana").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(bendum, PeranPanitia.bendahara).valid, true);

      // Ditolak peran lain
      assert.equal(validasiKesesuaianJabatanPi(bendum, "Ketua Pelaksana").valid, false);
      assert.equal(validasiKesesuaianJabatanPi(bendum, "Sekretaris Pelaksana").valid, false);
      assert.equal(validasiKesesuaianJabatanPi(bendum, "pj_sie_acara").valid, false);
      assert.equal(validasiKesesuaianJabatanPi(bendum, "Anggota").valid, false);
    });

    it("Sekretaris Inti hanya boleh ditugaskan sebagai peran Sekretaris", () => {
      assert.equal(validasiKesesuaianJabatanPi(sekinti, "Sekretaris Inti").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(sekinti, "Sekretaris Pelaksana").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(sekinti, PeranPanitia.sekretaris).valid, true);

      // Ditolak peran lain
      assert.equal(validasiKesesuaianJabatanPi(sekinti, "Ketua Pelaksana").valid, false);
      assert.equal(validasiKesesuaianJabatanPi(sekinti, "Bendahara Pelaksana").valid, false);
      assert.equal(validasiKesesuaianJabatanPi(sekinti, "Anggota").valid, false);
    });

    it("Pengurus biasa / non-PI dapat ditugaskan ke peran kepanitiaan apa saja", () => {
      assert.equal(validasiKesesuaianJabatanPi(staf, "Ketua Pelaksana").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(staf, "Sekretaris Inti").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(staf, "Bendahara Pelaksana").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(staf, "Penanggung Jawab Sie Acara").valid, true);
      assert.equal(validasiKesesuaianJabatanPi(staf, "Anggota Sie Acara").valid, true);
    });
  });
});
