export default function Logo({ size = 60 }) {
  return (
    <span
      style={{
        fontSize: Math.round(size * 0.4),
        fontWeight: 800,
        color: "#F2C230",
        letterSpacing: 0.5,
        display: "block",
        lineHeight: 1,
      }}
    >
      MyTracks
    </span>
  );
}
