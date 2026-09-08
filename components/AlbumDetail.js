"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Stars from "@/components/Stars";

export default function AlbumDetail({ item, userId, onClose, onSaved }) {
  const [directRating, setDirectRating] = useState(5);
  const [comment, setComment] = useState("");
  const [trackRatings, setTrackRatings] = useState({}); // { index: rating }
  const [tracks, setTracks] = useState([]);
  const [releaseDate, setReleaseDate] = useState(null);
  const [genres, setGenres] = useState([]);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item || !userId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      await supabase.from("catalog_items").upsert({
        id: item.id,
        type: "album",
        title: item.title,
        artist: item.artist,
        cover_url: item.coverUrl,
        deezer_id: item.deezerId ? String(item.deezerId) : item.deezer_id || null,
      });

      const [ratingRes, trackRatingsRes, deezerRes] = await Promise.all([
        supabase
          .from("album_ratings")
          .select("rating, comment")
          .eq("user_id", userId)
          .eq("item_id", item.id)
          .maybeSingle(),
        supabase
          .from("track_ratings")
          .select("track_index, rating")
          .eq("user_id", userId)
          .eq("item_id", item.id),
        item.deezerId || item.deezer_id
          ? fetch(`/api/deezer-album?id=${item.deezerId || item.deezer_id}`).then((r) => r.json())
          : Promise.resolve({ tracks: [], releaseDate: null, genres: [] }),
      ]);

      if (cancelled) return;

      if (ratingRes.data) {
        setDirectRating(ratingRes.data.rating);
        setComment(ratingRes.data.comment || "");
      } else {
        setDirectRating(5);
        setComment("");
      }

      const map = {};
      (trackRatingsRes.data || []).forEach((r) => (map[r.track_index] = r.rating));
      setTrackRatings(map);

      setTracks(deezerRes.tracks || []);
      setReleaseDate(deezerRes.releaseDate || null);
      setGenres(deezerRes.genres || []);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [item, userId]);

  if (!item) return null;

  const trackValues = Object.values(trackRatings);
  const computed = trackValues.length > 0 ? trackValues.reduce((s, v) => s + v, 0) / trackValues.length * 2 : null;
  const displayedRating = computed !== null ? computed : directRating;

  const saveAlbumRating = async (rating, newComment) => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("album_ratings").upsert(
      {
        user_id: userId,
        item_id: item.id,
        rating,
        comment: newComment,
      },
      { onConflict: "user_id,item_id" }
    );
    setSaving(false);
    if (onSaved) onSaved(item.id, rating);
  };

  const handleSliderChange = (value) => {
    setDirectRating(value);
  };

  const handleSaveClick = () => {
    saveAlbumRating(directRating, comment);
  };

  const handleTrackRate = async (index, value) => {
    const updated = { ...trackRatings, [index]: value };
    setTrackRatings(updated);

    const supabase = createClient();
    await supabase.from("track_ratings").upsert(
      {
        user_id: userId,
        item_id: item.id,
        track_index: index,
        rating: value,
      },
      { onConflict: "user_id,item_id,track_index" }
    );

    const values = Object.values(updated);
    const avg = (values.reduce((s, v) => s + v, 0) / values.length) * 2;
    await saveAlbumRating(avg, comment);
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
            <img src={item.coverUrl} alt="" className="w-48 h-48 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="w-48 h-48 rounded-2xl bg-zinc-800" />
          )}
        </div>

        <p className="text-2xl font-extrabold text-center leading-tight mb-1">{item.title}</p>
        <p className="text-sm text-zinc-400 text-center mb-1">{item.artist}</p>
        {releaseDate ? (
          <p className="text-xs text-zinc-500 text-center mb-4">{releaseDate.slice(0, 4)}</p>
        ) : (
          <div className="mb-4" />
        )}

        {genres.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {genres.map((g) => (
              <span key={g} className="bg-white/[0.06] text-zinc-300 text-[11px] rounded-full px-3 py-1">
                {g}
              </span>
            ))}
          </div>
        )}

        <div className="bg-white/[0.04] rounded-2xl p-4 mb-5">
          <p className="text-xs text-zinc-400 mb-2">
            {computed !== null
              ? `Note de l'album (moyenne sur ${trackValues.length} titre${trackValues.length > 1 ? "s" : ""})`
              : "Ta note d'album, sur 10"}
          </p>
          {computed !== null ? (
            <p className="text-3xl font-extrabold text-mtgold">{computed.toFixed(1)} / 10</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl font-extrabold text-mtgold w-12">{directRating}</span>
                <input
                  type="range"
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={directRating}
                  onChange={(e) => handleSliderChange(Number(e.target.value))}
                  className="flex-1 accent-mtgold"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Note automatiquement remplacee par la moyenne si tu notes des titres individuellement.
              </p>
            </>
          )}
        </div>

        <p className="text-xs text-zinc-400 mb-2">Ton avis (optionnel)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ecris ce que tu as pense de cet album..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-sm outline-none resize-none mb-4"
        />

        <button
          onClick={handleSaveClick}
          disabled={saving}
          className="w-full bg-mtgold text-black rounded-full py-3 font-bold mb-6 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saving ? "..." : "ENREGISTRER LA NOTE"}
        </button>

        <button
          onClick={() => setTracksOpen((v) => !v)}
          className="w-full flex items-center justify-between text-sm font-bold py-2"
        >
          Noter chaque titre
          <span>{tracksOpen ? "▲" : "▼"}</span>
        </button>

        {tracksOpen && (
          <div className="flex flex-col gap-3 mt-3">
            {loading && <p className="text-zinc-400 text-sm">Chargement des titres...</p>}
            {!loading && tracks.length === 0 && (
              <p className="text-zinc-400 text-sm">Impossible de recuperer la liste des titres.</p>
            )}
            {tracks.map((t) => (
              <div key={t.index} className="flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-300 truncate flex-1">
                  {t.index}. {t.title}
                </span>
                <Stars
                  value={trackRatings[t.index] || 0}
                  onChange={(v) => handleTrackRate(t.index, v)}
                  size={16}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
