"use client";

export default function Stars({ value, onChange, size = 20 }) {
  const handleClick = (e, n) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    onChange(isLeftHalf ? n - 0.5 : n);
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const full = value >= n;
        const half = !full && value >= n - 0.5;
        return (
          <button
            key={n}
            onClick={(e) => {
              e.stopPropagation();
              handleClick(e, n);
            }}
            style={{ width: size, height: size, position: "relative" }}
            className="flex-shrink-0"
          >
            <span
              style={{ fontSize: size, lineHeight: 1, color: "#3f3f46", position: "absolute", inset: 0 }}
            >
              ☆
            </span>
            {(full || half) && (
              <span
                style={{
                  fontSize: size,
                  lineHeight: 1,
                  color: "#F2C230",
                  position: "absolute",
                  inset: 0,
                  overflow: "hidden",
                  width: full ? "100%" : "50%",
                }}
              >
                ★
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
