type RotationRingProps = {
  size?: number;
  memberCount?: number;
  activeIndex?: number;
};

/**
 * The Ajo signature graphic: members arranged in a circle, one lit gold
 * to represent whose turn it is to receive the pot this cycle. A slow,
 * reduced-motion-aware sweep marks the ring turning over time.
 */
export function RotationRing({
  size = 320,
  memberCount = 8,
  activeIndex = 0,
}: RotationRingProps) {
  const center = size / 2;
  const radius = size * 0.38;
  const nodeRadius = size * 0.035;

  const nodes = Array.from({ length: memberCount }, (_, i) => {
    const angle = (i / memberCount) * 2 * Math.PI - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      active: i === activeIndex,
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Rotating contribution circle with one member highlighted for the current payout"
      className="overflow-visible"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#8B93A7"
        strokeOpacity={0.25}
        strokeWidth={1.5}
      />

      <g
        className="animate-ring-sweep motion-reduce:animate-none"
        style={{ transformOrigin: `${center}px ${center}px` }}
      >
        <circle cx={center} cy={center - radius} r={2.5} fill="#D4A64A" fillOpacity={0.9} />
      </g>

      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={nodeRadius}
          fill={n.active ? "#D4A64A" : "#121B33"}
          stroke={n.active ? "#E8C878" : "#8B93A7"}
          strokeWidth={n.active ? 2 : 1}
          className={n.active ? "animate-node-pulse" : undefined}
        />
      ))}

      <circle cx={center} cy={center} r={nodeRadius * 0.6} fill="#D4A64A" fillOpacity={0.15} />
    </svg>
  );
}
