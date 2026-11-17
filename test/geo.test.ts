import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hitungJarakHaversine } from "../lib/geo";

describe("hitungJarakHaversine", () => {
  it("menghasilkan 0 meter jika koordinat identik", () => {
    const jarak = hitungJarakHaversine(-7.0505, 110.4355, -7.0505, 110.4355);
    assert.equal(jarak, 0);
  });

  it("menghitung jarak yang akurat antar dua titik di Polines", () => {
    // Titik GSG Polines (-7.0526, 110.4348) ke Gedung AB (-7.0515, 110.4358) ~165m
    const jarak = hitungJarakHaversine(-7.0526, 110.4348, -7.0515, 110.4358);
    assert.ok(jarak > 100 && jarak < 200, `Jarak terhitung: ${jarak}m`);
  });

  it("menghitung jarak jauh secara realistis", () => {
    // Jakarta Monas (-6.1754, 106.8272) ke Simpang Lima Semarang (-6.9904, 110.4229) ~400km
    const jarak = hitungJarakHaversine(-6.1754, 106.8272, -6.9904, 110.4229);
    assert.ok(jarak > 390_000 && jarak < 420_000, `Jarak terhitung: ${jarak}m`);
  });
});
