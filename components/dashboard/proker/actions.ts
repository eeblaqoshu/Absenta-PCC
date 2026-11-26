// components/dashboard/proker/actions.ts
// Re-export seluruh fungsi aksi untuk halaman Program Kerja, Agenda, dan Kepanitiaan

export {
  buatProkerAction,
  ubahProkerAction,
  hapusProkerAction,
} from "@/lib/actions/proker";

export {
  buatAgendaAction,
  ubahAgendaAction,
  hapusAgendaAction,
} from "@/lib/actions/agenda";

export {
  tambahPanitiaAction,
  tambahBanyakPanitiaAction,
  imporCsvPanitiaAction,
  ubahPanitiaAction,
  hapusPanitiaAction,
} from "@/lib/actions/kepanitiaan";
