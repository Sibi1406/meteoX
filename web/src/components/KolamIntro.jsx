import { useEffect, useState } from "react";

const paths = [
  "M32 18 C24 18 24 30 32 38 L68 74 C76 82 64 90 56 82 L20 46 C12 38 20 26 28 34 L64 70 C72 78 84 66 76 58 L40 22 C32 14 20 26 28 34",
  "M68 18 C76 18 76 30 68 38 L32 74 C24 82 36 90 44 82 L80 46 C88 38 80 26 72 34 L36 70 C28 78 16 66 24 58 L60 22 C68 14 80 26 72 34",
  "M20 46 C12 38 20 26 28 34 M80 46 C88 38 80 26 72 34",
  "M20 58 C12 66 20 78 28 70 M80 58 C88 66 80 78 72 70",
];

const dots = [
  [32, 18], [68, 18],
  [20, 38], [80, 38],
  [20, 62], [80, 62],
  [32, 82], [68, 82],
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
        <circle className="kolam-center" cx="50" cy="50" r="4.2" />
        {paths.map((d, index) => (
          <path key={index} className="kolam-thread" d={d} />
        ))}
      </svg>
    </div>
  );
}
