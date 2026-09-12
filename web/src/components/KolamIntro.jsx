import { useEffect, useState } from "react";

const paths = [
  "M22 50 L22 22 L50 22 L50 38 L62 38 L62 22 L78 22 L78 50 L62 50 L62 62 L78 62 L78 78 L50 78 L50 62 L22 62 L22 50",
  "M50 18 L82 50 L50 82 L18 50 Z",
  "M32 50 L32 32 L50 32 L50 50 L68 50 L68 68 L50 68 L50 50 L32 50",
  "M50 10 L90 50 L50 90 L10 50 Z",
];

const dots = [
  [18, 18], [50, 18], [82, 18],
  [18, 50], [50, 50], [82, 50],
  [18, 82], [50, 82], [82, 82],
  [32, 32], [68, 32], [32, 68], [68, 68],
];

export default function KolamIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1450);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="kolam-intro" aria-hidden="true">
      <svg className="kolam-intro-mark" viewBox="0 0 100 100" role="presentation">
        {dots.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} className="kolam-dot" cx={cx} cy={cy} r="2.3" />
        ))}
        {paths.map((d, index) => (
          <path key={index} className="kolam-thread" d={d} />
        ))}
      </svg>
    </div>
  );
}
