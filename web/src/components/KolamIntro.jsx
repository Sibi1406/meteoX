import { useEffect, useState } from "react";

const paths = [
  "M22 22 H78 V78 H22 Z",
  "M36 36 H64 V64 H36 Z",
  "M22 50 H36 M64 50 H78 M50 22 V36 M50 64 V78",
];

const dots = [
  [18, 18], [50, 18], [82, 18],
  [18, 50], [50, 50], [82, 50],
  [18, 82], [50, 82], [82, 82],
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
