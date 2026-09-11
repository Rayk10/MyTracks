"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import Spinner from "@/components/Spinner";
import useBackButtonClose from "@/hooks/useBackButtonClose";
import AlbumDetail from "@/components/AlbumDetail";
import RatingSheet from "@/components/RatingSheet";

export default function ArtistOverlay({ artistName, artistId, userId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [singles, setSingles] = useState([]);
  const [myRatings, setMyRatings] = useState({});

  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const [albumItem, setAlbumItem] = useState(null);
  const [ratingItem, setRatingItem] = useState(null);

  useBackButtonClose(true, onClose);
  useBackButtonClose(!!albumItem, () => setAlbumItem(null));
  useBackButtonClose(!!ratingItem, () => setRatingItem(null));

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      setLoading(true);

      try {
        const lookupUrl = artistId
          ? "/api/deezer-artist-lookup?id=" + artistId
          : "/api/deezer-artist-lookup?name=" + encodeURIComponent(artistName);
        const lookupRes = await fetch(lookupUrl);
        const lookupData = await lookupRes.json();
        if (cancelled) return;

        if (!lookupData.artist) {
          setArtist(null);
          setLoading(false);
          return;
        }
        setArtist(lookupData.artist);

        const discoRes = await fetch(
          "/api/deezer-artist?id=" + lookupData.artist.artistId + "&name=" + encodeURIComponent(artistName)
        );
        const discoData = await discoRes.json();
        if (cancelled) return;

        setAlbums(discoData.albums || []);
        setSingles(discoData.singles || []);

        if (userId) {
          const { data: ratingsData } = await supabase
            .from("album_ratings")
            .select("item_id, rating")
            .eq("user_id", userId);
          if (!cancelled) {
            const map = {};
            (ratingsData || []).forEach((r) => (map[r.item_id] = r.rating));
            setMyRatings(map);
          }
        }
      } catch (err) {
        setArtist(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [artistName, artistId, userId]);

  const openItem = (item) => {
    if (item.type === "album") {
      setAlbumItem(item);
    } else {
      setRatingItem(item);
    }
  };

  const togglePreview = (item) => {
    if (!item.previewUrl) return;
    if (playingId === item.id) {
      if (audioRef.current) audioRef.current.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = item.previewUrl;
        audioRef.current.play();
      }
      setPlayingId(item.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-y-auto max-w-md mx-auto">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      <div className="sticky top-0 z-40 flex items-center px-4 py-3 bg-black/70 backdrop-blur">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xl"
        >
          ←
        </button>
      </div>

      {loading && (
        <div className="px-4">
          <Spinner />
        </div>
      )}

      {!loading && !artist && (
        <p className="text-zinc-400 text-sm px-4">Artiste introuvable.</p>
      )}

      {!loading && artist && (
        <>
          <div className="relative w-full -mt-14" style={{ aspectRatio: "1 / 0.9" }}>
            {artist.pictureUrl ? (
              <img
                src={artist.pictureUrl.replace("medium", "big")}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800" />
            )}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 85%, #000 100%)" }}
            />
            <div className="absolute bottom-4 left-4 right-4">
              {artist.nbFan ? (
                <p className="text-xs text-zinc-300 mb-1">{artist.nbFan.toLocaleString("fr-FR")} fans</p>
              ) : null}
              <p className="text-3xl font-extrabold leading-tight">{artist.name}</p>
            </div>
          </div>

          <div className="px-4 pt-5 pb-10">
            <p className="text-lg font-extrabold mb-3">Projets</p>
            {albums.length === 0 ? (
              <p className="text-zinc-400 text-sm">Aucun projet trouve pour cet artiste.</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              {albums.map((item) => (
                <div key={item.id} className="cursor-pointer" onClick={() => openItem(item)}>
                  <div className="relative">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt="" className="w-full aspect-square rounded-xl object-cover" />
                    ) : (
                      <div className="w-full aspect-square rounded-xl bg-zinc-800" />
                    )}
                    <span className="absolute top-2 left-2 bg-mtgold text-black text-[10px] font-bold rounded px-1.5 py-0.5">
                      {item.releaseType === "ep" ? "EP" : item.releaseType === "mixtape" ? "MIXTAPE" : "ALBUM"}
                    </span>
                    {myRatings[item.id] !== undefined ? (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-mtgold text-xs font-bold rounded px-1.5 py-0.5">
                        {myRatings[item.id]}/10
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold mt-1.5 truncate">{item.title}</p>
                  {item.releaseDate ? (
                    <p className="text-xs text-zinc-400 truncate">{item.releaseDate.slice(0, 4)}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {singles.length > 0 ? (
              <>
                <p className="text-lg font-extrabold mb-3 mt-8">Singles</p>
                <div className="flex flex-col gap-3">
                  {singles.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2">
                      <div className="flex-shrink-0 cursor-pointer" onClick={() => openItem(item)}>
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-zinc-800" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openItem(item)}>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <span className="bg-mtgold text-black text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                            SINGLE
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          {item.releaseDate ? item.releaseDate.slice(0, 4) : "Titre populaire"}
                        </p>
                      </div>
                      {item.previewUrl ? (
                        <button
                          onClick={() => togglePreview(item)}
                          className="w-8 h-8 rounded-full bg-mtgold text-black flex items-center justify-center flex-shrink-0 text-xs active:scale-90 transition-transform"
                        >
                          {playingId === item.id ? "II" : "▶"}
                        </button>
                      ) : null}
                      {myRatings[item.id] !== undefined ? (
                        <span className="text-mtgold text-xs font-bold flex-shrink-0">{myRatings[item.id]}/5</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={ratingItem ? myRatings[ratingItem.id] : undefined}
        onClose={() => setRatingItem(null)}
        onSaved={(id, v) =>
          setMyRatings((p) => {
            const updated = { ...p };
            if (v === null) delete updated[id];
            else updated[id] = v;
            return updated;
          })
        }
        disableArtistLink
        disableAlbumLink
      />

      <AlbumDetail
        item={albumItem}
        userId={userId}
        onClose={() => setAlbumItem(null)}
        onSaved={(id, v) =>
          setMyRatings((p) => {
            const updated = { ...p };
            if (v === null) delete updated[id];
            else updated[id] = v;
            return updated;
          })
        }
        disableArtistLink
      />
    </div>
  );
}
