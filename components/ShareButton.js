"use client";

import { useState } from "react";

export default function ShareButton({ title, artist }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = `Ecoute "${title}" de ${artist} sur MyTracks !`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (err) {
        // annule par l'utilisateur, on ne fait rien
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex-1 bg-white/[0.06] rounded-xl py-3 text-sm font-bold active:scale-95 transition-transform"
    >
      {copied ? "Copie !" : "Partager"}
    </button>
  );
}
