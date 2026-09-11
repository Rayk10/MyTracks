"use client";

import { useRef, useState } from "react";

export default function Stars({ value, onChange, onChangeEnd, size = 20 }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [previewValue, setPreviewValue] = useState(null);
  const lastValueRef = useRef(value);

  const computeValue = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const raw = Math.max(0.5, Math.min(5, ratio * 5));
    return Math.round(raw * 2) / 2;
  };

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const v = computeValue(e.clientX);
    setPreviewValue(v);
    lastValueRef.current = v;
    onChange(v);
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    const v = computeValue(e.clientX);
    setPreviewValue(v);
    lastValueRef.current = v;
    onChange(v);
  };

  const handlePointerUp = () => {
    setDragging(false);
    setPreviewValue(null);
    if (onChangeEnd) onChangeEnd(lastValueRef.current);
  };

  const displayValue = previewValue !== null ? previewValue : value;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: "none" }}
      className="flex gap-0.5 select-none"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const full = displayValue >= n;
        const half = !full && displayValue >= n - 0.5;
        return (
          <div key={n} style={{ width: size, height: size, position: "relative" }} className="flex-shrink-0">
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
          </div>
        );
      })}
    </div>
  );
}
