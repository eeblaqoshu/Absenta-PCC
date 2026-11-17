import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { putuskanAkses } from "../lib/akses";
import { TargetPeserta, PeranPanitia } from "@prisma/client";

describe("lib/akses - putuskanAkses", () => {
  it("menolak jika tidak berada di periode yang sama", () => {
    const res = putuskanAkses({
      targetPeserta: TargetPeserta.semua_panitia_sto,
      periodeSama: false,
      peran: null,
    });
    assert.equal(res.boleh, false);
    assert.match(res.alasan ?? "", /periode/i);
  });

  describe("targetPeserta: semua_panitia_sto", () => {
    it("mengizinkan siapa saja selama periode sama walau bukan panitia", () => {
      const res = putuskanAkses({
        targetPeserta: TargetPeserta.semua_panitia_sto,
        periodeSama: true,
        peran: null,
      });
      assert.equal(res.boleh, true);
    });
  });

  describe("targetPeserta: semua_panitia", () => {
    it("menolak jika bukan panitia (peran: null)", () => {
      const res = putuskanAkses({
        targetPeserta: TargetPeserta.semua_panitia,
        periodeSama: true,
        peran: null,
      });
      assert.equal(res.boleh, false);
      assert.match(res.alasan ?? "", /panitia/i);
    });

    it("mengizinkan jika panitia dengan peran apa pun (termasuk anggota)", () => {
      const res = putuskanAkses({
        targetPeserta: TargetPeserta.semua_panitia,
        periodeSama: true,
        peran: PeranPanitia.anggota,
      });
      assert.equal(res.boleh, true);
    });
  });

  describe("targetPeserta: hanya_pj_pi", () => {
    it("menolak anggota biasa", () => {
      const res = putuskanAkses({
        targetPeserta: TargetPeserta.hanya_pj_pi,
        periodeSama: true,
        peran: PeranPanitia.anggota,
      });
      assert.equal(res.boleh, false);
      assert.match(res.alasan ?? "", /khusus/i);
    });

    it("mengizinkan pengurus inti (ketua, sekretaris, bendahara)", () => {
      for (const peran of [PeranPanitia.ketua, PeranPanitia.sekretaris, PeranPanitia.bendahara]) {
        const res = putuskanAkses({
          targetPeserta: TargetPeserta.hanya_pj_pi,
          periodeSama: true,
          peran,
        });
        assert.equal(res.boleh, true);
      }
    });

    it("mengizinkan koordinator divisi (pj_divisi)", () => {
      const res = putuskanAkses({
        targetPeserta: TargetPeserta.hanya_pj_pi,
        periodeSama: true,
        peran: PeranPanitia.pj_divisi,
      });
      assert.equal(res.boleh, true);
    });
  });
});
