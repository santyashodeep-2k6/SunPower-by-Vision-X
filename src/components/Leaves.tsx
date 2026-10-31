/* Out-of-focus foliage silhouettes, backlit with a faint golden rim. */
const LEAVES = [
  { x: 34, y: 20, r: -24, s: 0.85 },
  { x: 66, y: 32, r: 58, s: 0.95 },
  { x: 104, y: 50, r: -32, s: 1.05 },
  { x: 146, y: 70, r: 66, s: 1.05 },
  { x: 186, y: 93, r: -18, s: 1.2 },
  { x: 224, y: 117, r: 78, s: 1.05 },
  { x: 262, y: 142, r: 28, s: 1.25 },
]

export function Leaves({
  className = "",
  id,
}: {
  className?: string
  id: string
}) {
  return (
    <svg
      viewBox="0 0 420 300"
      className={`pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1E5A3E" />
          <stop offset="1" stopColor="#0A2A1E" />
        </linearGradient>
      </defs>
      <path
        d="M0 6 C 60 28, 150 70, 272 148"
        fill="none"
        stroke="#0B2C20"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {LEAVES.map((l, i) => (
        <g
          key={i}
          transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}
        >
          <path
            d="M0 0 C 18 -17 62 -19 100 0 C 62 19 18 17 0 0 Z"
            fill={`url(#${id}-leaf)`}
            stroke="rgb(244 197 66 / 0.35)"
            strokeWidth="1"
          />
          <path
            d="M2 0 L 94 0"
            stroke="rgb(255 240 190 / 0.18)"
            strokeWidth="1"
          />
        </g>
      ))}
    </svg>
  )
}
