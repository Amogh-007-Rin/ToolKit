"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    function markNested() {
      document.querySelectorAll("[class*='overflow-']").forEach((el) => {
        if (!el.hasAttribute("data-lenis-prevent")) {
          el.setAttribute("data-lenis-prevent", "");
        }
      });
    }

    markNested();

    const observer = new MutationObserver(() => markNested());
    observer.observe(document.body, { subtree: true, childList: true, attributes: false });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
