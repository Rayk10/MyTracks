export default function Logo({ size = 60 }) {
  return (
    <img
      src="/logo.jpg"
      alt="MyTracks"
      style={{ width: size, height: size, display: "block", mixBlendMode: "screen" }}
    />
  );
}
