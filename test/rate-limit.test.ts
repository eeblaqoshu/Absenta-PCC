import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { cekBatasLaju, resetBatasLaju, bersihkanCatatanKedaluwarsa } from "../lib/rate-limit";

describe("lib/rate-limit", () => {
  beforeEach(() => {
    resetBatasLaju();
  });

  it("mengizinkan permintaan di bawah batas maksimal", () => {
    const kunci = "test:user1";
    assert.equal(cekBatasLaju(kunci, 3, 1000), true);
    assert.equal(cekBatasLaju(kunci, 3, 1000), true);
    assert.equal(cekBatasLaju(kunci, 3, 1000), true);
  });

  it("menolak permintaan yang melebihi batas maksimal", () => {
    const kunci = "test:user2";
    assert.equal(cekBatasLaju(kunci, 2, 1000), true);
    assert.equal(cekBatasLaju(kunci, 2, 1000), true);
    assert.equal(cekBatasLaju(kunci, 2, 1000), false);
  });

  it("mengizinkan kembali setelah jendela waktu berlalu", () => {
    const kunci = "test:user3";
    const sekarang = 1000000;
    assert.equal(cekBatasLaju(kunci, 1, 1000, sekarang), true);
    assert.equal(cekBatasLaju(kunci, 1, 1000, sekarang + 500), false);
    // Setelah lewat 1000ms
    assert.equal(cekBatasLaju(kunci, 1, 1000, sekarang + 1500), true);
  });

  it("membersihkan entri kedaluwarsa untuk mencegah kebocoran memori", () => {
    const sekarang = 1000000;
    cekBatasLaju("user:lama", 5, 1000, sekarang);
    cekBatasLaju("user:baru", 5, 1000, sekarang + 2000);

    // Bersihkan entri yang umurnya lebih dari 1000ms di waktu sekarang + 2500
    bersihkanCatatanKedaluwarsa(sekarang + 2500, 1000);

    // Kunci user:lama sudah dibersihkan, sehingga dapat membuat request baru
    assert.equal(cekBatasLaju("user:lama", 5, 1000, sekarang + 2500), true);
  });
});
