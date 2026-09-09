"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Stars from "@/components/Stars";
import CommunityRating from "@/components/CommunityRating";
import ShareButton from "@/components/ShareButton";
import ListPickerButton from "@/components/ListPickerButton";
import StreamingLinks from "@/components/StreamingLinks";

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
  const [justSaved, setJustSaved] = useState(false);
  const [releaseType, setReleaseType] = useState("album");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (!item || !userId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      const { error: initialCatalogError } = await supabase.from("catalog_items").upsert({
        id: item.id,
        type: "album",
        title: item.title,
        artist: item.artist,
        cover_url: item.coverUrl,
        deezer_id: item.deezerId ? String(item.deezerId) : item.deezer_id || null,
      });
      if (initialCatalogError) {
        setSaveError("Erreur (chargement) : " + initialCatalogError.message);
      }

      const { data: currentRow } = await supabase
        .from("catalog_items")
        .select("release_type")
        .eq("id", item.id)
        .maybeSingle();
      const currentReleaseType = currentRow && currentRow.release_type;

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
          : Promise.all([
              supabase.from("catalog_items").select("genre, year").eq("id", item.id).maybeSingle(),
              supabase
                .from("custom_tracks")
                .select("track_index, title")
                .eq("item_id", item.id)
                .order("track_index", { ascending: true }),
            ]).then(([itemRes, tracksRes]) => ({
              tracks: (tracksRes.data || []).map((t) => ({
                index: t.track_index,
                title: t.title,
                previewUrl: null,
              })),
              releaseDate: itemRes.data && itemRes.data.year ? `${itemRes.data.year}-01-01` : null,
              genres: itemRes.data && itemRes.data.genre ? [itemRes.data.genre] : [],
            })),
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
      const fetchedGenres = deezerRes.genres || [];
      setGenres(fetchedGenres);

      const updatePayload = {};
      if (fetchedGenres.length > 0) updatePayload.genre = fetchedGenres[0];
      if (deezerRes.releaseDate) updatePayload.year = parseInt(deezerRes.releaseDate.slice(0, 4), 10);

      const isFromDeezer = !!(item.deezerId || item.deezer_id);
      // Deezer est prioritaire pour distinguer Album/EP (donnee officielle du label)
      let finalType = currentReleaseType || deezerRes.releaseType || "album";

      // MusicBrainz ne sert qu'a detecter specifiquement "Mixtape" (que Deezer ne connait pas),
      // sans jamais contredire ce que Deezer a determine pour Album/EP
      if (isFromDeezer && !currentReleaseType) {
        try {
          const mbRes = await fetch(
            `/api/musicbrainz-type?artist=${encodeURIComponent(item.artist)}&title=${encodeURIComponent(
              item.title
            )}`
          ).then((r) => r.json());
          if (mbRes.releaseType === "mixtape") {
            finalType = "mixtape";
          }
        } catch (err) {
          // Deezer reste la reference, aucun changement necessaire
        }
      }

      setReleaseType(finalType);
      if (finalType !== currentReleaseType) {
        updatePayload.release_type = finalType;
      }

      if (Object.keys(updatePayload).length > 0) {
        await supabase.from("catalog_items").update(updatePayload).eq("id", item.id);
      }
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
    setSaveError("");
    const supabase = createClient();

    const { error: catalogError } = await supabase.from("catalog_items").upsert({
      id: item.id,
      type: "album",
      title: item.title,
      artist: item.artist,
      cover_url: item.coverUrl,
      deezer_id: item.deezerId ? String(item.deezerId) : item.deezer_id || null,
    });
    if (catalogError) {
      setSaving(false);
      setSaveError("Erreur (fiche) : " + catalogError.message);
      return false;
    }

    const { error } = await supabase.from("album_ratings").upsert(
      {
        user_id: userId,
        item_id: item.id,
        rating,
        comment: newComment,
      },
      { onConflict: "user_id,item_id" }
    );
    setSaving(false);
    if (error) {
      setSaveError("Erreur (note) : " + error.message);
      return false;
    }
    if (onSaved) onSaved(item.id, rating);
    return true;
  };

  const handleSliderChange = (value) => {
    setDirectRating(value);
  };

  const handleSaveClick = async () => {
    const ok = await saveAlbumRating(directRating, comment);
    if (ok) {
      setJustSaved(true);
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  const handleTrackRate = async (index, value) => {
    const updated = { ...trackRatings, [index]: value };
    setTrackRatings(updated);
    setSaveError("");

    const supabase = createClient();
    const { error: trackError } = await supabase.from("track_ratings").upsert(
      {
        user_id: userId,
        item_id: item.id,
        track_index: index,
        rating: value,
      },
      { onConflict: "user_id,item_id,track_index" }
    );
    if (trackError) {
      setSaveError("Erreur (titre) : " + trackError.message);
      return;
    }

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

        <div className="flex justify-center mb-6">
          <span className="text-xs font-bold rounded-full px-3 py-1.5 bg-white/[0.06] text-zinc-300">
            {releaseType === "ep" ? "EP" : releaseType === "mixtape" ? "Mixtape" : "Album"}
          </span>
        </div>

        {genres.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {genres.map((g) => (
              <span key={g} className="bg-white/[0.06] text-zinc-300 text-[11px] rounded-full px-3 py-1">
                {g}
              </span>
            ))}
          </div>
        )}

        <CommunityRating itemId={item.id} maxScale={10} />

        <div className="flex gap-2 mb-4">
          <ShareButton title={item.title} artist={item.artist} />
          <ListPickerButton
            userId={userId}
            itemPayload={{
              id: item.id,
              type: "album",
              title: item.title,
              artist: item.artist,
              cover_url: item.coverUrl,
              deezer_id: item.deezerId ? String(item.deezerId) : item.deezer_id || null,
            }}
          />
        </div>

        <StreamingLinks title={item.title} artist={item.artist} deezerId={item.deezerId} />

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
          placeholder="Écris ce que tu as pensé de cet album..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-sm outline-none resize-none mb-4"
        />

        {saveError && <p className="text-red-400 text-xs mb-3">{saveError}</p>}

        <button
          onClick={handleSaveClick}
          disabled={saving || justSaved}
          className={`w-full rounded-full py-3 font-bold mb-6 disabled:opacity-90 active:scale-95 transition-all ${
            justSaved ? "bg-green-500 text-black" : "bg-mtgold text-black"
          }`}
        >
          {saving ? "..." : justSaved ? "✓ Enregistre" : "ENREGISTRER LA NOTE"}
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
              <p className="text-zinc-400 text-sm">Impossible de récupérer la liste des titres.</p>
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
