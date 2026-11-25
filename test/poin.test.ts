import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  adalahAgendaBerpoin,
  tentukanKategori,
  hitungPoin,
  isKetuplakAtauWaketuplak,
  BOBOT_POIN,
} from "../lib/poin";
import { JenisAgenda, StatusPresensi } from "@prisma/client";

describe("lib/poin", () => {
  it("hadir tepat waktu pada Hari H menghasilkan 2 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.hadir,
      adaIzinDisetujui: false,
      jenisAgenda: JenisAgenda.hari_h,
    });
    assert.equal(kategori, "tepat_waktu");
    assert.equal(
      hitungPoin({
        status: StatusPresensi.hadir,
        adaIzinDisetujui: false,
        jenisAgenda: JenisAgenda.hari_h,
      }),
      2
    );
  });

  it("hadir terlambat tanpa izin pada Hari H menghasilkan 1 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.terlambat,
      adaIzinDisetujui: false,
      jenisAgenda: JenisAgenda.hari_h,
    });
    assert.equal(kategori, "terlambat_tanpa_izin");
    assert.equal(
      hitungPoin({
        status: StatusPresensi.terlambat,
        adaIzinDisetujui: false,
        jenisAgenda: JenisAgenda.hari_h,
      }),
      1
    );
  });

  it("hadir terlambat dengan izin disetujui pada Hari H menghasilkan 1 poin", () => {
    const kategori = tentukanKategori({
      status: StatusPresensi.terlambat,
      adaIzinDisetujui: true,
      jenisAgenda: JenisAgenda.hari_h,
    });
    assert.equal(kategori, "terlambat_dengan_izin");
    assert.equal(
      hitungPoin({
        status: StatusPresensi.terlambat,
        adaIzinDisetujui: true,
        jenisAgenda: JenisAgenda.hari_h,
      }),
      1
    );
  });

  it("alpa tanpa izin pada Hari H menghasilkan -2 poin", () => {
    const kategori = tentukanKategori({
      status: null,
      adaIzinDisetujui: false,
      jenisAgenda: JenisAgenda.hari_h,
    });
    assert.equal(kategori, "alpa_tanpa_izin");
    assert.equal(
      hitungPoin({
        status: null,
        adaIzinDisetujui: false,
        jenisAgenda: JenisAgenda.hari_h,
      }),
      -2
    );
  });

  it("alpa dengan izin disetujui pada Hari H menghasilkan 0 poin", () => {
    const kategori = tentukanKategori({
      status: null,
      adaIzinDisetujui: true,
      jenisAgenda: JenisAgenda.hari_h,
    });
    assert.equal(kategori, "alpa_dengan_izin");
    assert.equal(
      hitungPoin({
        status: null,
        adaIzinDisetujui: true,
        jenisAgenda: JenisAgenda.hari_h,
      }),
      0
    );
  });

  it("rapat PJ, rapat besar (rabes), dan rapat koordinasi (rakoor) selalu bernilai 0 poin", () => {
    assert.equal(adalahAgendaBerpoin(JenisAgenda.hari_h), true);
    assert.equal(adalahAgendaBerpoin(JenisAgenda.rapat_pj), false);
    assert.equal(adalahAgendaBerpoin(JenisAgenda.rapat_besar), false);
    assert.equal(adalahAgendaBerpoin(JenisAgenda.rapat_koordinasi), false);

    for (const jenis of [
      JenisAgenda.rapat_pj,
      JenisAgenda.rapat_besar,
      JenisAgenda.rapat_koordinasi,
    ]) {
      assert.equal(
        hitungPoin({
          status: StatusPresensi.hadir,
          adaIzinDisetujui: false,
          jenisAgenda: jenis,
        }),
        0
      );
      assert.equal(
        hitungPoin({
          status: StatusPresensi.terlambat,
          adaIzinDisetujui: false,
          jenisAgenda: jenis,
        }),
        0
      );
      assert.equal(
        hitungPoin({
          status: null,
          adaIzinDisetujui: false,
          jenisAgenda: jenis,
        }),
        0
      );
    }
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
