import { test, describe } from "node:test";
import assert from "node:assert";
import {
  buatSessionTokenLokal,
  verifikasiSessionTokenLokal,
} from "../lib/token-verifier";

describe("lib/token-verifier - Session Token Lokal", () => {
  test("berhasil membuat dan memverifikasi token sesi lokal bertanda tangan HMAC", () => {
    const payload = {
      email: "sto.test@mhs.polines.ac.id",
      uid: "uid-test-12345",
      expiresInMs: 60_000,
    };

    const token = buatSessionTokenLokal(payload);
    assert.ok(token.startsWith("absenta_"));

    const verified = verifikasiSessionTokenLokal(token);
    assert.ok(verified !== null);
    assert.strictEqual(verified.email, payload.email);
    assert.strictEqual(verified.uid, payload.uid);
  });

  test("menolak token yang dimanipulasi atau tanpa signature sah", () => {
    const payload = {
      email: "sto.test@mhs.polines.ac.id",
      uid: "uid-test-12345",
      expiresInMs: 60_000,
    };

    const token = buatSessionTokenLokal(payload);
    const manipulated = token.slice(0, -5) + "xyz12";
    assert.strictEqual(verifikasiSessionTokenLokal(manipulated), null);
  });

  test("menolak token yang sudah kedaluwarsa", () => {
    const payload = {
      email: "sto.test@mhs.polines.ac.id",
      uid: "uid-test-12345",
      expiresInMs: -1000, // sudah lewat
    };

    const token = buatSessionTokenLokal(payload);
    assert.strictEqual(verifikasiSessionTokenLokal(token), null);
  });
});
