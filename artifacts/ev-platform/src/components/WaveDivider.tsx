export function WaveDivider({
  fill = "#000",
  topFill = "transparent",
  flipped = false,
  className = "",
}: {
  fill?: string;
  topFill?: string;
  flipped?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ height: "80px" }}>
      {/* Wave layer 1 — primary */}
      <div className="wave-wrap" style={{ height: "80px", opacity: 0.8 }}>
        <svg
          viewBox="0 0 1440 80"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "80px", display: "block", transform: flipped ? "scaleY(-1)" : undefined }}
          preserveAspectRatio="none"
        >
          <path
            d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,20 1440,40 L1440,80 L0,80 Z"
            fill={fill}
          />
        </svg>
        <svg
          viewBox="0 0 1440 80"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "80px", display: "block", transform: flipped ? "scaleY(-1)" : undefined }}
          preserveAspectRatio="none"
        >
          <path
            d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,20 1440,40 L1440,80 L0,80 Z"
            fill={fill}
          />
        </svg>
      </div>
      {/* Wave layer 2 — slower, reversed */}
      <div className="wave-wrap wave-wrap-rev" style={{ height: "80px" }}>
        <svg
          viewBox="0 0 1440 80"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "80px", display: "block", transform: flipped ? "scaleY(-1)" : undefined }}
          preserveAspectRatio="none"
        >
          <path
            d="M0,50 C240,10 480,70 720,50 C960,30 1200,70 1440,50 L1440,80 L0,80 Z"
            fill={fill}
            fillOpacity="0.6"
          />
        </svg>
        <svg
          viewBox="0 0 1440 80"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "80px", display: "block", transform: flipped ? "scaleY(-1)" : undefined }}
          preserveAspectRatio="none"
        >
          <path
            d="M0,50 C240,10 480,70 720,50 C960,30 1200,70 1440,50 L1440,80 L0,80 Z"
            fill={fill}
            fillOpacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
