export default function Spinner({ size = 28, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div
        style={{
          width: size,
          height: size,
          border: "3px solid rgba(242,194,48,0.25)",
          borderTopColor: "#F2C230",
          borderRadius: "50%",
        }}
        className="animate-spin"
      />
      {label ? <p className="text-zinc-400 text-sm">{label}</p> : null}
    </div>
  );
}
