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

    function isScrollable(el: HTMLElement): boolean {
      return (
        el.scrollHeight > el.clientHeight + 1 ||
        el.scrollWidth > el.clientWidth + 1
      );
    }

    function markNested() {
      document
        .querySelectorAll<HTMLElement>("[class*='overflow-']:not([data-lenis-wrapper])")
        .forEach((el) => {
          if (isScrollable(el)) {
            if (!el.hasAttribute("data-lenis-prevent")) {
              el.setAttribute("data-lenis-prevent", "");
            }
          } else if (el.hasAttribute("data-lenis-prevent")) {
            el.removeAttribute("data-lenis-prevent");
          }
        });
    }

    let rafId: number;
    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      if (frame++ % 5 === 0) markNested();
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

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
