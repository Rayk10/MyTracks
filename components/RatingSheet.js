"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabaseClient";
import CommunityRating from "@/components/CommunityRating";
import ShareButton from "@/components/ShareButton";
import ListPickerButton from "@/components/ListPickerButton";
import WatchlistButton from "@/components/WatchlistButton";
import CommunityComments from "@/components/CommunityComments";
import AlbumDetail from "@/components/AlbumDetail";
import ArtistOverlay from "@/components/ArtistOverlay";
import useBackButtonClose from "@/hooks/useBackButtonClose";
import StreamingLinks from "@/components/StreamingLinks";

export default function RatingSheet({ item, userId, currentRating, onClose, onSaved, disableArtistLink, disableAlbumLink }) {
  const [ratingValue, setRatingValue] = useState(2.5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [loadingComment, setLoadingComment] = useState(true);
  const [saveError, setSaveError] = useState("");
  const starsRef = useRef(null);
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [draggingStars, setDraggingStars] = useState(false);
  const [artistOverlayOpen, setArtistOverlayOpen] = useState(false);
  const [parentAlbumItem, setParentAlbumItem] = useState(null);
  const [loadingParentAlbum, setLoadingParentAlbum] = useState(false);

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

  useBackButtonClose(artistOverlayOpen, () => setArtistOverlayOpen(false));
  useBackButtonClose(!!parentAlbumItem, () => setParentAlbumItem(null));

  if (!item) return null;

  const canLinkArtist = !disableArtistLink && !!(item.artistId || item.deezerId || item.deezer_id);
  const computeStarValue = (clientX) => {
    const rect = starsRef.current.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const raw = Math.max(0, Math.min(5, ratio * 5));
    return Math.round(raw * 2) / 2;
  };

  const handleStarsPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingStars(true);
    setRatingValue(computeStarValue(e.clientX));
  };

  const handleStarsPointerMove = (e) => {
    if (!draggingStars) return;
    setRatingValue(computeStarValue(e.clientX));
  };

  const handleStarsPointerUp = () => {
    setDraggingStars(false);
    if (ratingValue === 0) {
      resetRating(true);
    }
  };

  const openParentAlbum = async () => {
    const match = item.id.match(/^(.+)-track-\d+$/);
    if (!match) return;
    const albumId = match[1];

    setLoadingParentAlbum(true);
    const supabase = createClient();
    const { data } = await supabase.from("catalog_items").select("*").eq("id", albumId).maybeSingle();
    setLoadingParentAlbum(false);

    if (data) {
      setParentAlbumItem({
        id: data.id,
        type: "album",
        title: data.title,
        artist: data.artist,
        coverUrl: data.cover_url,
        deezerId: data.deezer_id,
      });
    }
  };

  const hasParentAlbum = /^(.+)-track-\d+$/.test(item.id);

  const save = async () => {
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
    const realUserId = session.user.id;

    const { error: catalogError } = await supabase.from("catalog_items").upsert({
      id: item.id,
      type: item.type,
      title: item.title,
      artist: item.artist,
      artist_id: item.artistId || null,
      cover_url: item.coverUrl,
      deezer_id: item.deezerId ? String(item.deezerId) : null,
      preview_url: item.previewUrl || null,
    });

    if (catalogError) {
      setSaving(false);
      setSaveError("Erreur (fiche) : " + catalogError.message);
      return;
    }

    const { error } = await supabase.from("album_ratings").upsert(
      {
        user_id: realUserId,
        item_id: item.id,
        rating: ratingValue,
        comment,
      },
      { onConflict: "user_id,item_id" }
    );

    setSaving(false);
    if (error) {
      setSaveError("Erreur (note) : " + error.message);
      return;
    }
    onSaved(item.id, ratingValue);
    setJustSaved(true);
    setTimeout(() => {
      setJustSaved(false);
    }, 1200);
  };

  const togglePreview = () => {
    if (!item.previewUrl) return;
    if (playing) {
      if (audioRef.current) audioRef.current.pause();
      setPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = item.previewUrl;
        audioRef.current.play();
      }
      setPlaying(true);
    }
  };

  const resetRating = async (skipConfirm) => {
    if (!skipConfirm && !window.confirm("Es-tu sûr de vouloir réinitialiser cette note ?")) {
      return;
    }
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
      setSaveError("Erreur (reinitialisation) : " + error.message);
      return;
    }

    setRatingValue(2.5);
    setComment("");
    onSaved(item.id, null);
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
          <p
            onClick={() => !disableAlbumLink && hasParentAlbum && openParentAlbum()}
            className={`text-2xl font-extrabold text-center leading-tight ${
              !disableAlbumLink && hasParentAlbum ? "cursor-pointer underline" : ""
            }`}
          >
            {loadingParentAlbum ? "..." : item.title}
          </p>
          <span className="bg-mtgold text-black text-[10px] font-bold rounded px-1.5 py-0.5 flex-shrink-0">
            SINGLE
          </span>
        </div>
        <p
          onClick={() => canLinkArtist && setArtistOverlayOpen(true)}
          className={`text-sm text-zinc-400 text-center mb-6 ${
            canLinkArtist ? "cursor-pointer underline" : ""
          }`}
        >
          {item.artist}
          {item.releaseDate ? ` · ${item.releaseDate.slice(0, 4)}` : ""}
        </p>

        <audio ref={audioRef} onEnded={() => setPlaying(false)} />

        {item.previewUrl ? (
          <button
            onClick={togglePreview}
            className="w-full flex items-center justify-center gap-2 bg-white/[0.06] rounded-full py-2.5 text-sm font-bold mb-4 active:scale-95 transition-transform"
          >
            {playing ? "❚❚ En lecture" : "▶ Ecouter l'extrait"}
          </button>
        ) : null}

        <CommunityRating itemId={item.id} maxScale={5} />

        <CommunityComments itemId={item.id} userId={userId} maxScale={5} />

        <WatchlistButton
          userId={userId}
          itemPayload={{
            id: item.id,
            type: item.type,
            title: item.title,
            artist: item.artist,
            artist_id: item.artistId || null,
            cover_url: item.coverUrl,
            deezer_id: item.deezerId ? String(item.deezerId) : null,
            preview_url: item.previewUrl || null,
          }}
        />

        <div className="flex gap-2 mb-4">
          <ShareButton title={item.title} artist={item.artist} />
          <ListPickerButton
            userId={userId}
            itemPayload={{
              id: item.id,
              type: item.type,
              title: item.title,
              artist: item.artist,
              artist_id: item.artistId || null,
              cover_url: item.coverUrl,
              deezer_id: item.deezerId ? String(item.deezerId) : null,
              preview_url: item.previewUrl || null,
            }}
          />
        </div>

        <StreamingLinks title={item.title} artist={item.artist} deezerId={item.deezerId} />

        <div className="bg-white/[0.04] rounded-2xl p-4 mb-5">
          <p className="text-xs text-zinc-400 mb-3">Ta note du titre, sur 5</p>
          <div
            ref={starsRef}
            onPointerDown={handleStarsPointerDown}
            onPointerMove={handleStarsPointerMove}
            onPointerUp={handleStarsPointerUp}
            onPointerCancel={handleStarsPointerUp}
            style={{ touchAction: "none" }}
            className="flex gap-1.5 select-none"
          >
            {[1, 2, 3, 4, 5].map((n) => {
              const full = ratingValue >= n;
              const half = !full && ratingValue >= n - 0.5;
              return (
                <div key={n} style={{ width: 32, height: 32, position: "relative" }} className="flex-shrink-0">
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
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-zinc-400 mb-2">Ton avis (optionnel)</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Écris ce que tu as pensé de ce single..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-sm outline-none resize-none mb-6"
        />

        {saveError && <p className="text-red-400 text-xs mb-3">{saveError}</p>}

        <button
          onClick={save}
          disabled={saving || justSaved}
          className={`w-full rounded-full py-3 font-bold disabled:opacity-90 active:scale-95 transition-all ${
            justSaved ? "bg-green-500 text-black" : "bg-mtgold text-black"
          }`}
        >
          {saving ? "..." : justSaved ? "✓ Enregistré" : "ENREGISTRER LA NOTE"}
        </button>

        {currentRating !== undefined && (
          <button
            onClick={resetRating}
            disabled={saving}
            className="w-full border border-red-500/40 text-red-400 bg-red-500/10 rounded-full py-3 text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform"
          >
            Réinitialiser la note
          </button>
        )}
      </div>

      {artistOverlayOpen && (
        <ArtistOverlay
          artistName={item.artist}
          artistId={item.artistId}
          userId={userId}
          onClose={() => setArtistOverlayOpen(false)}
        />
      )}

      <AlbumDetail
        item={parentAlbumItem}
        userId={userId}
        onClose={() => setParentAlbumItem(null)}
        onSaved={() => {}}
        disableArtistLink
      />
    </div>
  );
}
