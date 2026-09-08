"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function RatingSheet({ item, userId, currentRating, onClose, onSaved }) {
  const [ratingValue, setRatingValue] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setRatingValue(currentRating || (item.type === "album" ? 5 : 2.5));
    }
  }, [item, currentRating]);

  if (!item) return null;

  const save = async () => {
    setSaving(true);
    const supabase = createClient();

    await supabase.from("catalog_items").upsert({
      id: item.id,
      type: item.type,
      title: item.title,
      artist: item.artist,
      cover_url: item.coverUrl,
      deezer_id: item.deezerId ? String(item.deezerId) : null,
      preview_url: item.previewUrl || null,
    });

    const { error } = await supabase.from("album_ratings").upsert({
      user_id: userId,
      item_id: item.id,
      rating: ratingValue,
    });

    setSaving(false);
    if (!error) {
      onSaved(item.id, ratingValue);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end z-20" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 w-full max-w-md mx-auto rounded-t-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          {item.coverUrl && (
            <img src={item.coverUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
          )}
          <div>
            <p className="font-bold text-sm">{item.title}</p>
            <p className="text-xs text-zinc-400">{item.artist}</p>
          </div>
        </div>

        <p className="text-xs text-zinc-400 mb-2">
          Ta note {item.type === "album" ? "d'album, sur 10" : "de titre, sur 5"}
        </p>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl font-extrabold text-mtgold w-10">{ratingValue}</span>
          <input
            type="range"
            min={0.5}
            max={item.type === "album" ? 10 : 5}
            step={0.5}
            value={ratingValue}
            onChange={(e) => setRatingValue(Number(e.target.value))}
            className="flex-1 accent-mtgold"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-mtgold text-black rounded-full py-3 font-bold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saving ? "..." : "ENREGISTRER LA NOTE"}
        </button>
      </div>
    </div>
  );
}
