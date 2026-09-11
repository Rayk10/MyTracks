"use client";

import { useEffect, useState, useRef } from "react";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabaseClient";
import Stars from "@/components/Stars";
import CommunityRating from "@/components/CommunityRating";
import ShareButton from "@/components/ShareButton";
import ListPickerButton from "@/components/ListPickerButton";
import StreamingLinks from "@/components/StreamingLinks";
import useBackButtonClose from "@/hooks/useBackButtonClose";
import CommunityComments from "@/components/CommunityComments";
import ArtistOverlay from "@/components/ArtistOverlay";
import WatchlistButton from "@/components/WatchlistButton";

export default function AlbumDetail({ item, userId, onClose, onSaved, disableArtistLink }) {
  const [directRating, setDirectRating] = useState(5);
  const [comment, setComment] = useState("");
  const [trackRatings, setTrackRatings] = useState({}); // { index: rating }
  const [trackDetailOpen, setTrackDetailOpen] = useState(null);
  const [previewPlayingIndex, setPreviewPlayingIndex] = useState(null);
  const previewAudioRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [releaseDate, setReleaseDate] = useState(null);
  const [genres, setGenres] = useState([]);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [releaseType, setReleaseType] = useState("album");
  const [saveError, setSaveError] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [artistOverlayOpen, setArtistOverlayOpen] = useState(false);

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
        artist_id: item.artistId || null,
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
          .select("rating, comment, is_manual")
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
        setManualOverride(!!ratingRes.data.is_manual);
      } else {
        setDirectRating(5);
        setComment("");
        setManualOverride(false);
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

  useBackButtonClose(!!trackDetailOpen, () => setTrackDetailOpen(null));
  useBackButtonClose(artistOverlayOpen, () => setArtistOverlayOpen(false));

  if (!item) return null;

  const trackValues = Object.values(trackRatings);
  const computed = trackValues.length > 0 ? trackValues.reduce((s, v) => s + v, 0) / trackValues.length * 2 : null;
  const displayedRating = computed !== null ? computed : directRating;

  const saveAlbumRating = async (rating, newComment, isManual) => {
    setSaving(true);
    setSaveError("");
    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaving(false);
      setSaveError("Ta session a expire. Reconnecte-toi puis reessaie.");
      return false;
    }
    const realUserId = session.user.id;

    const { error: catalogError } = await supabase.from("catalog_items").upsert({
      id: item.id,
      type: "album",
      title: item.title,
      artist: item.artist,
      artist_id: item.artistId || null,
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
        user_id: realUserId,
        item_id: item.id,
        rating,
        comment: newComment,
        is_manual: isManual,
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
    const ok = await saveAlbumRating(directRating, comment, true);
    if (ok) {
      setManualOverride(true);
      setJustSaved(true);
      setTimeout(() => {
        setJustSaved(false);
      }, 1200);
    }
  };

  const togglePreview = (track) => {
    if (!track.previewUrl) return;
    if (previewPlayingIndex === track.index) {
      if (previewAudioRef.current) previewAudioRef.current.pause();
      setPreviewPlayingIndex(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = track.previewUrl;
        previewAudioRef.current.play();
      }
      setPreviewPlayingIndex(track.index);
    }
  };

  const handleTrackPreview = (index, value) => {
    setTrackRatings((prev) => ({ ...prev, [index]: value }));
  };

  const handleTrackRate = async (index, value) => {
    const updated = { ...trackRatings, [index]: value };
    setTrackRatings(updated);
    setSaveError("");

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSaveError("Ta session a expire. Reconnecte-toi puis reessaie.");
      return;
    }
    const realUserId = session.user.id;

    const { error: trackError } = await supabase.from("track_ratings").upsert(
      {
        user_id: realUserId,
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

    // Ce titre devient aussi un vrai "single" independant, visible dans Mes notes et les Stats
    const trackInfo = tracks.find((t) => t.index === index);
    if (trackInfo) {
      const singleId = `${item.id}-track-${index}`;
      const { error: singleCatalogError } = await supabase.from("catalog_items").upsert({
        id: singleId,
        type: "single",
        title: trackInfo.title,
        artist: item.artist,
        artist_id: item.artistId || null,
        cover_url: item.coverUrl,
        preview_url: trackInfo.previewUrl || null,
      });
      if (!singleCatalogError) {
        await supabase.from("album_ratings").upsert(
          {
            user_id: realUserId,
            item_id: singleId,
            rating: value,
          },
          { onConflict: "user_id,item_id" }
        );
      }
    }

    const values = Object.values(updated);
    const avg = Math.round(((values.reduce((s, v) => s + v, 0) / values.length) * 2) * 2) / 2;
    if (!manualOverride) {
      setDirectRating(avg);
      await saveAlbumRating(avg, comment, false);
    }
  };

  const recalculateFromTracks = async () => {
    const values = Object.values(trackRatings);
    if (values.length === 0) return;
    const avg = Math.round(((values.reduce((s, v) => s + v, 0) / values.length) * 2) * 2) / 2;
    setDirectRating(avg);
    setManualOverride(false);
    await saveAlbumRating(avg, comment, false);
  };

  const resetAlbumRating = async () => {
    setSaving(true);
    setSaveError("");
    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaving(false);
      setSaveError("Ta session a expire. Reconnecte-toi puis reessaie.");
      return;
    }

    const { error } = await supabase
      .from("album_ratings")
      .delete()
      .eq("user_id", session.user.id)
      .eq("item_id", item.id);

    setSaving(false);
    if (error) {
      setSaveError("Erreur (réinitialisation) : " + error.message);
      return;
    }

    setDirectRating(5);
    setComment("");
    setManualOverride(false);
    if (onSaved) onSaved(item.id, null);
  };

  const resetTrackRating = async (index) => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setSaveError("Ta session a expire. Reconnecte-toi puis reessaie.");
      return;
    }

    await supabase
      .from("track_ratings")
      .delete()
      .eq("user_id", session.user.id)
      .eq("item_id", item.id)
      .eq("track_index", index);

    await supabase
      .from("album_ratings")
      .delete()
      .eq("user_id", session.user.id)
      .eq("item_id", `${item.id}-track-${index}`);

    setTrackRatings((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });

    if (!manualOverride) {
      const remaining = Object.values(trackRatings).filter((_, i) => i !== index);
      const values = Object.entries(trackRatings)
        .filter(([i]) => Number(i) !== index)
        .map(([, v]) => v);
      if (values.length > 0) {
        const avg = Math.round(((values.reduce((s, v) => s + v, 0) / values.length) * 2) * 2) / 2;
        setDirectRating(avg);
        await saveAlbumRating(avg, comment, false);
      }
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
            <img src={item.coverUrl} alt="" className="w-48 h-48 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="w-48 h-48 rounded-2xl bg-zinc-800" />
          )}
        </div>

        <p className="text-2xl font-extrabold text-center leading-tight mb-1">{item.title}</p>
        <p
          onClick={() => !disableArtistLink && setArtistOverlayOpen(true)}
          className={`text-sm text-zinc-400 text-center mb-1 ${!disableArtistLink ? "cursor-pointer underline" : ""}`}
        >
          {item.artist}
        </p>
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

        <CommunityComments itemId={item.id} userId={userId} maxScale={10} />

        <WatchlistButton
          userId={userId}
          itemPayload={{
            id: item.id,
            type: "album",
            release_type: releaseType,
            title: item.title,
            artist: item.artist,
            artist_id: item.artistId || null,
            cover_url: item.coverUrl,
            deezer_id: item.deezerId ? String(item.deezerId) : item.deezer_id || null,
          }}
        />

        <div className="flex gap-2 mb-4">
          <ShareButton title={item.title} artist={item.artist} />
          <ListPickerButton
            userId={userId}
            itemPayload={{
              id: item.id,
              type: "album",
              title: item.title,
              artist: item.artist,
              artist_id: item.artistId || null,
              cover_url: item.coverUrl,
              deezer_id: item.deezerId ? String(item.deezerId) : item.deezer_id || null,
            }}
          />
        </div>

        <StreamingLinks title={item.title} artist={item.artist} deezerId={item.deezerId} />

        <div className="bg-white/[0.04] rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400">
              {manualOverride
                ? "Note manuelle"
                : computed !== null
                ? `Calculee automatiquement (${trackValues.length} titre${trackValues.length > 1 ? "s" : ""} note${trackValues.length > 1 ? "s" : ""})`
                : "Ta note d'album, sur 10"}
            </p>
            {manualOverride && computed !== null && (
              <button
                onClick={recalculateFromTracks}
                className="text-[11px] text-mtgold font-bold flex-shrink-0"
              >
                ↺ Recalculer
              </button>
            )}
          </div>

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
            {manualOverride
              ? "Tu as fixe cette note toi-meme, elle ne changera plus automatiquement."
              : "Se recalcule automatiquement a chaque titre note. Ajuste-la et enregistre pour la fixer toi-meme."}
          </p>
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
          onClick={resetAlbumRating}
          disabled={saving}
          className="w-full text-red-400 text-sm font-bold py-3 mb-3 disabled:opacity-50"
        >
          Réinitialiser la note de l&apos;album
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
            {loading && <Spinner size={20} />}
            {!loading && tracks.length === 0 && (
              <p className="text-zinc-400 text-sm">Impossible de récupérer la liste des titres.</p>
            )}
            {tracks.map((t) => (
              <div key={t.index} className="flex items-center justify-between gap-3">
                <span
                  onClick={() => setTrackDetailOpen(t)}
                  className="text-base text-zinc-300 truncate flex-1 cursor-pointer"
                >
                  {t.index}. {t.title}
                </span>
                <Stars
                  value={trackRatings[t.index] || 0}
                  onChange={(v) => handleTrackPreview(t.index, v)}
                  onChangeEnd={(v) => handleTrackRate(t.index, v)}
                  size={20}
                />
                {trackRatings[t.index] ? (
                  <button
                    onClick={() => resetTrackRating(t.index)}
                    className="text-zinc-500 text-xs flex-shrink-0 ml-1"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
            <audio ref={previewAudioRef} onEnded={() => setPreviewPlayingIndex(null)} />
          </div>
        )}
      </div>

      {trackDetailOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-40"
          onClick={() => setTrackDetailOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base truncate flex-1">{trackDetailOpen.title}</p>
              <button
                onClick={() => setTrackDetailOpen(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg flex-shrink-0"
              >
                ×
              </button>
            </div>
            <p
              onClick={() => !disableArtistLink && setArtistOverlayOpen(true)}
              className={`text-xs text-zinc-400 mb-5 ${!disableArtistLink ? "cursor-pointer underline" : ""}`}
            >
              {item.artist}
            </p>

            {trackDetailOpen.previewUrl ? (
              <button
                onClick={() => togglePreview(trackDetailOpen)}
                className="w-full flex items-center justify-center gap-2 bg-mtgold text-black rounded-full py-3 font-bold mb-5 active:scale-95 transition-transform"
              >
                {previewPlayingIndex === trackDetailOpen.index ? "❚❚ En lecture" : "▶ Ecouter l'extrait"}
              </button>
            ) : null}

            <p className="text-xs text-zinc-400 mb-3">Ta note du titre, sur 5</p>
            <div className="mb-2">
              <Stars
                value={trackRatings[trackDetailOpen.index] || 0}
                onChange={(v) => handleTrackPreview(trackDetailOpen.index, v)}
                onChangeEnd={(v) => handleTrackRate(trackDetailOpen.index, v)}
                size={28}
              />
            </div>
            {trackRatings[trackDetailOpen.index] ? (
              <button
                onClick={() => resetTrackRating(trackDetailOpen.index)}
                className="text-red-400 text-xs font-bold mb-5"
              >
                Réinitialiser la note de ce titre
              </button>
            ) : (
              <div className="mb-5" />
            )}

            <WatchlistButton
              userId={userId}
              itemPayload={{
                id: `${item.id}-track-${trackDetailOpen.index}`,
                type: "single",
                title: trackDetailOpen.title,
                artist: item.artist,
                artist_id: item.artistId || null,
                cover_url: item.coverUrl,
                preview_url: trackDetailOpen.previewUrl || null,
              }}
            />

            <StreamingLinks title={trackDetailOpen.title} artist={item.artist} deezerId={item.deezerId} />
          </div>
        </div>
      )}

      {artistOverlayOpen && (
        <ArtistOverlay
          artistName={item.artist}
          artistId={item.artistId}
          userId={userId}
          onClose={() => setArtistOverlayOpen(false)}
        />
      )}
    </div>
  );
}
