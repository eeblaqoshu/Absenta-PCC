"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Saat mode development (next dev / Turbopack), matikan Service Worker & bersihkan cache
    // agar tidak pernah menyajikan chunk /_next/static/ lama yang memicu error HMR / hydration.
    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        try {
          const registrations =
            await navigator.serviceWorker.getRegistrations();
          let adaYangDihapus = false;
          for (const reg of registrations) {
            const berhasil = await reg.unregister();
            if (berhasil) adaYangDihapus = true;
          }

          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }

          if (
            adaYangDihapus &&
            navigator.serviceWorker.controller &&
            !sessionStorage.getItem("__sw_dev_cleared")
          ) {
            sessionStorage.setItem("__sw_dev_cleared", "1");
            window.location.reload();
          }
        } catch (err) {
          console.warn("Gagal membersihkan Service Worker dev:", err);
        }
      })();
      return;
    }

    if (window.location.protocol.startsWith("http")) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (
                  installingWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // Service worker versi baru berhasil dipasang
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn("PWA Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
