import { useEffect, useState } from "react";

const CONTOURS = [
  "M300 24 C410 20 506 74 518 154 C530 230 446 316 326 330 C208 344 92 284 76 204 C58 112 170 34 300 24 Z",
  "M300 62 C392 56 468 96 478 160 C488 220 418 278 326 290 C232 302 136 254 122 194 C108 126 206 72 300 62 Z",
  "M302 98 C378 92 432 120 440 166 C448 212 390 248 326 258 C254 268 180 232 168 188 C156 142 232 104 302 98 Z",
  "M302 132 C354 128 398 144 404 174 C410 204 366 228 326 234 C276 242 220 218 212 186 C204 156 254 136 302 132 Z",
  "M304 158 C344 154 368 166 372 184 C376 202 348 214 326 218 C292 222 258 206 254 188 C250 172 278 160 304 158 Z",
];

export function IsobarContours({ className = "" }) {
  return (
    <svg
      className={`isobar-lines ${className}`.trim()}
      viewBox="0 0 600 360"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {CONTOURS.map((path, index) => (
        <path key={index} d={path} pathLength="1" />
      ))}
    </svg>
  );
}

export default function IsobarIntro() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDismissed(true);
      return undefined;
    }
    const timeout = window.setTimeout(() => setDismissed(true), 1750);
    return () => window.clearTimeout(timeout);
  }, []);

  if (dismissed) return null;

  return (
    <div className="isobar-intro" aria-hidden="true">
      <IsobarContours className="isobar-intro-lines" />
    </div>
  );
}