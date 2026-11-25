// lib/divisi.ts
// Helper pemformatan & penyingkatan nama depan Divisi / Departemen.
// Modul murni (tanpa "use client") agar aman dipanggil di Server Component maupun Client Component.

export function formatLabelDivisi(divisi?: string | null): string {
  if (!divisi) return "Pengurus STO";
  const trim = divisi.trim();
  if (!trim) return "Pengurus STO";

  if (/^Pengurus\s+Harian$/i.test(trim)) {
    return "Pengurus Harian";
  }
  if (/^Pengurus\s+Inti$/i.test(trim)) {
    return "Pengurus Inti";
  }
  if (/^(Divisi\s+)?Penelitian\s+dan\s+Pengembangan$/i.test(trim)) {
    return "Div. Litbang";
  }

  // Jika sudah disingkat Div. atau Dep.
  if (/^(Div\.|Dep\.)\s*/i.test(trim)) {
    return trim.replace(/^(div\.)\s*/i, "Div. ").replace(/^(dep\.)\s*/i, "Dep. ");
  }
  // Singkat kata depan "Divisi" -> "Div."
  if (/^Divisi\s+/i.test(trim)) {
    return trim.replace(/^Divisi\s+/i, "Div. ");
  }
  // Singkat kata depan "Departemen" -> "Dep."
  if (/^Departemen\s+/i.test(trim)) {
    return trim.replace(/^Departemen\s+/i, "Dep. ");
  }

  return trim;
}
