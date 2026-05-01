"use client";

import { useEffect } from "react";
import anime from "animejs";

/** KPI stagger, count-up, status pulse per product motion spec. */
export function MotionBoot() {
  useEffect(() => {
    anime({
      targets: "[data-kpi-card]",
      translateY: [20, 0],
      rotateX: [-15, 0],
      opacity: [0, 1],
      duration: 720,
      easing: "easeOutExpo",
      delay: anime.stagger(100),
    });

    document.querySelectorAll("[data-count-up]").forEach((el) => {
      const raw = el.getAttribute("data-target");
      const target = raw != null ? Number(raw) : NaN;
      if (!Number.isFinite(target)) return;
      const obj = { v: 0 };
      anime({
        targets: obj,
        v: target,
        duration: 1500,
        easing: "easeOutExpo",
        update: () => {
          el.textContent = String(Math.round(obj.v));
        },
      });
    });

    anime({
      targets: ".status-dot",
      scale: [1, 1.4],
      opacity: [1, 0.4],
      duration: 2000,
      loop: true,
      easing: "easeInOutQuad",
      direction: "alternate",
    });
  }, []);

  return null;
}
