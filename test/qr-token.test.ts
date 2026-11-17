import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateQrToken,
  verifyQrToken,
  parsePayloadQr,
  susunPayloadQr,
  PAYLOAD_QR_PREFIX,
  getWindowNumber,
} from "../lib/qr-token";
import { QR_WINDOW_SECONDS } from "../lib/konstanta";

describe("lib/qr-token", () => {
  const secret = "rahasia-uji-coba-1234567890";
  const sesiId = 42;

  describe("susunPayloadQr & parsePayloadQr", () => {
    it("menyusun dan mem-parse payload format PRESENSI:<sesiId>:<token>", () => {
      const token = generateQrToken(secret, sesiId, 100);
      const payload = susunPayloadQr(sesiId, token);
      assert.ok(payload.startsWith(`${PAYLOAD_QR_PREFIX}:42:`));

      const parsed = parsePayloadQr(payload);
      assert.notEqual(parsed, null);
      assert.equal(parsed?.sesiId, 42);
      assert.equal(parsed?.token, token);
    });

    it("menolak payload dengan format salah atau invalid token", () => {
      assert.equal(parsePayloadQr("INVALID"), null);
      assert.equal(parsePayloadQr("PRESENSI:bukanangka:abc"), null);
      assert.equal(parsePayloadQr("PRESENSI:42:tokenterpendek"), null);
    });
  });

  describe("verifyQrToken", () => {
    it("menerima token pada jendela waktu saat ini", () => {
      const nowMs = 1700000000000;
      const windowNum = getWindowNumber(nowMs, QR_WINDOW_SECONDS);
      const token = generateQrToken(secret, sesiId, windowNum);

      assert.equal(verifyQrToken(token, secret, sesiId, nowMs), true);
    });

    it("menerima token dari 1 jendela sebelumnya (toleransi)", () => {
      const nowMs = 1700000000000;
      const windowNum = getWindowNumber(nowMs, QR_WINDOW_SECONDS);
      const tokenPrevious = generateQrToken(secret, sesiId, windowNum - 1);

      assert.equal(verifyQrToken(tokenPrevious, secret, sesiId, nowMs), true);
    });

    it("menolak token dari 2 jendela sebelumnya (sudah kadaluarsa)", () => {
      const nowMs = 1700000000000;
      const windowNum = getWindowNumber(nowMs, QR_WINDOW_SECONDS);
      const tokenExpired = generateQrToken(secret, sesiId, windowNum - 2);

      assert.equal(verifyQrToken(tokenExpired, secret, sesiId, nowMs), false);
    });

    it("menolak token dengan sesiId atau secret yang berbeda", () => {
      const nowMs = 1700000000000;
      const windowNum = getWindowNumber(nowMs, QR_WINDOW_SECONDS);
      const token = generateQrToken(secret, sesiId, windowNum);

      assert.equal(verifyQrToken(token, "secret-lain", sesiId, nowMs), false);
      assert.equal(verifyQrToken(token, secret, 999, nowMs), false);
    });
  });
});
