"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import CommunityRating from "@/components/CommunityRating";
import ShareButton from "@/components/ShareButton";
import ListPickerButton from "@/components/ListPickerButton";
import StreamingLinks from "@/components/StreamingLinks";

export default function RatingSheet({ item, userId, currentRating, onClose, onSaved }) {
  const [ratingValue, setRatingValue] = useState(2.5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [loadingComment, setLoadingComment] = useState(true);

  useEffect(() => {
    if (!item || !userId) return;
    setRatingValue(currentRating || 2.5);
    setLoadingComment(true);

    const supabase = createClient();
    supabase
      .from("album_ratings")
      .select("comment")
      .eq("user_id", userId)
      .eq("item_id", item.id)
      .maybeSingle()
      .then(({ data }) => {
        setComment(data?.comment || "");
        setLoadingComment(false);
      });
  }, [item, userId, currentRating]);

  if (!item) return null;

  const handleStarClick = (e, n) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setRatingValue(isLeftHalf ? n - 0.5 : n);
  };

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

    const { error } = await supabase.from("album_ratings").upsert(
      {
        user_id: userId,
        item_id: item.id,
        rating: ratingValue,
        comment,
      },
      { onConflict: "user_id,item_id" }
    );

    setSaving(false);
    if (!error) {
      onSaved(item.id, ratingValue);
      setJustSaved(true);
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-40 overflow-y-auto max-w-md mx-auto">
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg"
        >
          ×
        </button>
      </div>

      <div className="px-6 pb-10">
        <div className="flex justify-center mb-5">
          {item.coverUrl ? (
            <img src={item.coverUrl} alt="" className="w-40 h-40 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="w-40 h-40 rounded-2xl bg-zinc-800" />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-1">
          <p className="text-2xl font-extrabold text-center leading-tight">{item.title}</p>
          <span className="bg-mtgold text-black text-[10px] font-bold rounded px-1.5 py-0.5 flex-shrink-0">
            SINGLE
          </span>
        </div>
        <p className="text-sm text-zinc-400 text-center mb-6">
          {item.artist}
          {item.releaseDate ? ` · ${item.releaseDate.slice(0, 4)}` : ""}
        </p>

        <CommunityRating itemId={item.id} maxScale={5} />

        <div className="flex gap-2 mb-4">
          <ShareButton title={item.title} artist={item.artist} />
          <ListPickerButton
            userId={userId}
            itemPayload={{
              id: item.id,
              type: item.type,
              title: item.title,
              artist: item.artist,
              cover_url: item.coverUrl,
              deezer_id: item.deezerId ? String(item.deezerId) : null,
              preview_url: item.previewUrl || null,
            }}
          />
        </div>

        <StreamingLinks title={item.title} artist={item.artist} deezerId={item.deezerId} />

        <div className="bg-white/[0.04] rounded-2xl p-4 mb-5">
          <p className="text-xs text-zinc-400 mb-3">Ta note du titre, sur 5</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const full = ratingValue >= n;
              const half = !full && ratingValue >= n - 0.5;
              return (
                <button
                  key={n}
                  onClick={(e) => handleStarClick(e, n)}
                  style={{ width: 32, height: 32, position: "relative" }}
                >
                  <span style={{ fontSize: 32, lineHeight: 1, color: "#3f3f46", position: "absolute", inset: 0 }}>
                    ☆
                  </span>
                  {(full || half) && (
                    <span
                      style={{
                        fontSize: 32,
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
        </div>

        <p className="text-xs text-zinc-400 mb-2">Ton avis (optionnel)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ecris ce que tu as pense de ce single..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-sm outline-none resize-none mb-6"
        />

        <button
          onClick={save}
          disabled={saving || justSaved}
          className={`w-full rounded-full py-3 font-bold disabled:opacity-90 active:scale-95 transition-all ${
            justSaved ? "bg-green-500 text-black" : "bg-mtgold text-black"
          }`}
        >
          {saving ? "..." : justSaved ? "✓ Enregistre" : "ENREGISTRER LA NOTE"}
        </button>
      </div>
    </div>
  );
}
