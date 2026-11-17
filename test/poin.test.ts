import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  tentukanKategori,
  hitungPoin,
  BOBOT_POIN,
} from "../lib/poin";
import { StatusPresensi } from "@prisma/client";

describe("lib/poin", () => {
  it("hadir tepat waktu menghasilkan 2 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.hadir,
      adaIzinDisetujui: false,
    });
    assert.equal(kategori, "tepat_waktu");
    assert.equal(
      hitungPoin({ status: StatusPresensi.hadir, adaIzinDisetujui: false }),
      BOBOT_POIN.TEPAT_WAKTU
    );
  });

  it("terlambat tanpa izin menghasilkan -2 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.terlambat,
      adaIzinDisetujui: false,
    });
    assert.equal(kategori, "terlambat_tanpa_izin");
    assert.equal(
      hitungPoin({ status: StatusPresensi.terlambat, adaIzinDisetujui: false }),
      BOBOT_POIN.TERLAMBAT_TANPA_IZIN
    );
  });

  it("terlambat dengan izin disetujui menghasilkan 0 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.terlambat,
      adaIzinDisetujui: true,
    });
    assert.equal(kategori, "terlambat_dengan_izin");
    assert.equal(
      hitungPoin({ status: StatusPresensi.terlambat, adaIzinDisetujui: true }),
      BOBOT_POIN.TERLAMBAT_DENGAN_IZIN
    );
  });

  it("alpa tanpa izin menghasilkan -2 poin", () => {
    const kategori = tentukanKategori({
      status: null,
      adaIzinDisetujui: false,
    });
    assert.equal(kategori, "alpa_tanpa_izin");
    assert.equal(
      hitungPoin({ status: null, adaIzinDisetujui: false }),
      BOBOT_POIN.ALPA_TANPA_IZIN
    );
  });

  it("alpa dengan izin disetujui menghasilkan 0 poin", () => {
    const kategori = tentukanKategori({
      status: null,
      adaIzinDisetujui: true,
    });
    assert.equal(kategori, "alpa_dengan_izin");
    assert.equal(
      hitungPoin({ status: null, adaIzinDisetujui: true }),
      BOBOT_POIN.ALPA_DENGAN_IZIN
    );
  });
});
