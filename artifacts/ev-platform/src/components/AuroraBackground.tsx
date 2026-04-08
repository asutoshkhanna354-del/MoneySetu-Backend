export function AuroraBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Blob 1 — large deep purple */}
      <div
        className="aurora-blob aurora-blob-1"
        style={{
          width: "700px", height: "700px",
          background: "radial-gradient(circle, rgba(109,40,217,0.55) 0%, transparent 70%)",
          top: "-200px", left: "-100px",
        }}
      />
      {/* Blob 2 — violet mid */}
      <div
        className="aurora-blob aurora-blob-2"
        style={{
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
          top: "30%", right: "-150px",
        }}
      />
      {/* Blob 3 — fuchsia accent */}
      <div
        className="aurora-blob aurora-blob-3"
        style={{
          width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(192,38,211,0.25) 0%, transparent 70%)",
          bottom: "10%", left: "30%",
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />
    </div>
  );
}
