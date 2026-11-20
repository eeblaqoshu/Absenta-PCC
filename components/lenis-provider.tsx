"use client";

import { useEffect, useRef } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import { usePathname } from "next/navigation";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const pathname = usePathname();

  // Reset scroll & recompute dimensions on route change
  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    // Reset scroll to top immediately on navigation
    lenis.scrollTo(0, { immediate: true });

    // Recompute page dimensions
    lenis.resize();

    // Re-check after DOM render settles
    const rafId = requestAnimationFrame(() => {
      lenisRef.current?.lenis?.resize();
    });
    const timer = setTimeout(() => {
      lenisRef.current?.lenis?.resize();
    }, 150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [pathname]);

  // Observe body dimensions so when tables, accordions, or async data loads and changes page height,
  // Lenis always recomputes its scroll limits and never gets stuck.
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        lenisRef.current?.lenis?.resize();
      }, 60);
    });

    observer.observe(document.body);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
        syncTouch: false,
        allowNestedScroll: true,
        overscroll: true,
        autoResize: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
