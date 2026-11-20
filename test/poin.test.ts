import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  tentukanKategori,
  hitungPoin,
  isKetuplakAtauWaketuplak,
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
      2
    );
  });

  it("hadir terlambat tanpa izin menghasilkan 1 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.terlambat,
      adaIzinDisetujui: false,
    });
    assert.equal(kategori, "terlambat_tanpa_izin");
    assert.equal(
      hitungPoin({ status: StatusPresensi.terlambat, adaIzinDisetujui: false }),
      1
    );
  });

  it("hadir terlambat dengan izin disetujui menghasilkan 1 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.terlambat,
      adaIzinDisetujui: true,
    });
    assert.equal(kategori, "terlambat_dengan_izin");
    assert.equal(
      hitungPoin({ status: StatusPresensi.terlambat, adaIzinDisetujui: true }),
      1
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
      -2
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
      0
    );
  });

  it("mengenali peran ketuplak dan waketuplak untuk bonus 2 poin", () => {
    assert.equal(isKetuplakAtauWaketuplak("ketua", "Ketua Pelaksana"), true);
    assert.equal(isKetuplakAtauWaketuplak("ketua", "Wakil Ketua Pelaksana"), true);
    assert.equal(isKetuplakAtauWaketuplak("pj_divisi", "Waketuplak"), true);
    assert.equal(isKetuplakAtauWaketuplak("sekretaris", "Sekretaris Pelaksana"), false);
    assert.equal(isKetuplakAtauWaketuplak("anggota", "Anggota Sie Acara"), false);
    assert.equal(BOBOT_POIN.BONUS_KETUPLAK_WAKETUPLAK, 2);
  });
});
