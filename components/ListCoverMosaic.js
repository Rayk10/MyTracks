export default function ListCoverMosaic({ items, size = 64 }) {
  if (!items || items.length === 0) {
    return <div style={{ width: size, height: size, borderRadius: 8, background: "#27272a", flexShrink: 0 }} />;
  }
  if (items.length === 1) {
    const it = items[0];
    return it.cover_url ? (
      <img src={it.cover_url} alt="" style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
    ) : (
      <div style={{ width: size, height: size, borderRadius: 8, background: "#27272a", flexShrink: 0 }} />
    );
  }
  const quad = Array.from({ length: 4 }, (_, i) => items[i % items.length]);
  const half = size / 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        flexShrink: 0,
      }}
    >
      {quad.map((it, i) =>
        it.cover_url ? (
          <img key={i} src={it.cover_url} alt="" style={{ width: half, height: half, objectFit: "cover" }} />
        ) : (
          <div key={i} style={{ width: half, height: half, background: "#27272a" }} />
        )
      )}
    </div>
  );
}
