import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isDivisiLitbang,
  isPeranLitbangPengawas,
} from "../components/dashboard/proker-detail/types";

describe("Validasi Kepanitiaan Divisi Litbang", () => {
  describe("isDivisiLitbang", () => {
    it("mendeteksi pengurus dari divisi Litbang secara akurat", () => {
      assert.equal(isDivisiLitbang({ divisi: "Divisi Litbang" }), true);
      assert.equal(isDivisiLitbang({ divisi: "Litbang" }), true);
      assert.equal(
        isDivisiLitbang({ divisi: "Departemen Penelitian dan Pengembangan" }),
        true,
      );
      assert.equal(isDivisiLitbang({ jabatan: "Staff Litbang" }), true);
    });

    it("tidak mendeteksi divisi lain sebagai Litbang", () => {
      assert.equal(isDivisiLitbang({ divisi: "Divisi Workshop" }), false);
      assert.equal(isDivisiLitbang({ divisi: "Departemen Humas" }), false);
      assert.equal(isDivisiLitbang({ divisi: null, jabatan: null }), false);
      assert.equal(isDivisiLitbang(null), false);
    });
  });

  describe("isPeranLitbangPengawas", () => {
    it("mengenali peran litbang_pengawas", () => {
      assert.equal(isPeranLitbangPengawas("litbang_pengawas", null), true);
      assert.equal(
        isPeranLitbangPengawas(null, "Litbang Pengawas"),
        true,
      );
      assert.equal(
        isPeranLitbangPengawas("pj_divisi", "Litbang Pengawas"),
        true,
      );
    });

    it("menolak peran selain litbang pengawas", () => {
      assert.equal(
        isPeranLitbangPengawas("ketua_pelaksana", "Ketua Pelaksana"),
        false,
      );
      assert.equal(
        isPeranLitbangPengawas("sekretaris_inti", "Sekretaris Inti"),
        false,
      );
      assert.equal(
        isPeranLitbangPengawas("pj_sie_acara", "Penanggung Jawab Sie Acara"),
        false,
      );
      assert.equal(
        isPeranLitbangPengawas("anggota_sie_acara", "Anggota Sie Acara"),
        false,
      );
    });
  });
});
