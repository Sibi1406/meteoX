import { useEffect, useRef } from "react";

export default function useTilt(selector = null, maximumDegrees = 6) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return undefined;

    const clearTilt = (target) => {
      target.style.setProperty("--rx", "0deg");
      target.style.setProperty("--ry", "0deg");
    };

    const targetFor = (event) => {
      if (!selector) return root;
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      return target && root.contains(target) ? target : null;
    };

    const handleMove = (event) => {
      if (event.pointerType !== "mouse") return;
      const target = targetFor(event);
      if (!target) return;
      const bounds = target.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      target.style.setProperty("--rx", `${-y * maximumDegrees}deg`);
      target.style.setProperty("--ry", `${x * maximumDegrees}deg`);
    };

    const handleLeave = (event) => {
      if (selector) {
        const target = event.target instanceof Element ? event.target.closest(selector) : null;
        if (target && root.contains(target)) clearTilt(target);
      } else {
        clearTilt(root);
      }
    };

    root.addEventListener("pointermove", handleMove);
    root.addEventListener("pointerleave", handleLeave, true);
    return () => {
      root.removeEventListener("pointermove", handleMove);
      root.removeEventListener("pointerleave", handleLeave, true);
      if (selector) root.querySelectorAll(selector).forEach(clearTilt);
      else clearTilt(root);
    };
  }, [maximumDegrees, selector]);

  return ref;
}