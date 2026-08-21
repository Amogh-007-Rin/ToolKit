"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { DESKTOP_SCROLL_QUERY } from "./desktopScroll";

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_SCROLL_QUERY);
    let teardown: (() => void) | null = null;

    function setup(): () => void {
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
          .querySelectorAll<HTMLElement>(
            "[class*='overflow-auto']:not([data-lenis-wrapper]), [class*='overflow-scroll']:not([data-lenis-wrapper])",
          )
          .forEach((el) => {
            if (isScrollable(el)) {
              el.setAttribute("data-lenis-auto-prevent", "");
              el.setAttribute("data-lenis-prevent", "");
            } else if (el.hasAttribute("data-lenis-auto-prevent")) {
              el.removeAttribute("data-lenis-auto-prevent");
              el.removeAttribute("data-lenis-prevent");
            }
          });
      }

      let rafId: number;
      function raf(time: number) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      const observer = new MutationObserver(() => markNested());
      observer.observe(document.body, { subtree: true, childList: true, attributes: false });
      window.addEventListener("resize", markNested, { passive: true });
      markNested();

      return () => {
        cancelAnimationFrame(rafId);
        observer.disconnect();
        window.removeEventListener("resize", markNested);
        document.querySelectorAll<HTMLElement>("[data-lenis-auto-prevent]").forEach((el) => {
          el.removeAttribute("data-lenis-auto-prevent");
          el.removeAttribute("data-lenis-prevent");
        });
        lenis.destroy();
      };
    }

    function handleChange(event: MediaQueryList | MediaQueryListEvent) {
      if (event.matches) {
        if (!teardown) teardown = setup();
      } else if (teardown) {
        teardown();
        teardown = null;
      }
    }

    handleChange(query);
    query.addEventListener("change", handleChange);

    return () => {
      query.removeEventListener("change", handleChange);
      if (teardown) {
        teardown();
        teardown = null;
      }
    };
  }, []);

  return <>{children}</>;
}
