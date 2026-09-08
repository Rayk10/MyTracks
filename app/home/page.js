"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import RatingSheet from "@/components/RatingSheet";
import AlbumDetail from "@/components/AlbumDetail";

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);

  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const [ratingItem, setRatingItem] = useState(null); // singles/tracks
  const [albumItem, setAlbumItem] = useState(null); // albums
  const [myRatings, setMyRatings] = useState({});

  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistAlbums, setArtistAlbums] = useState([]);
  const [artistSingles, setArtistSingles] = useState([]);
  const [loadingArtist, setLoadingArtist] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("pseudo")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData);

      const { data: ratingsData } = await supabase
        .from("album_ratings")
        .select("item_id, rating")
        .eq("user_id", session.user.id);
      const map = {};
      (ratingsData || []).forEach((r) => (map[r.item_id] = r.rating));
      setMyRatings(map);

      setLoading(false);
    });
  }, [router]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setActiveFilter(null);
    try {
      const res = await fetch("/api/deezer-search?q=" + encodeURIComponent(query));
      if (!res.ok) throw new Error("Erreur serveur (" + res.status + ")");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
    } catch (err) {
      setSearchError(err.message || "La recherche a echoue.");
    } finally {
      setSearching(false);
    }
  };

  const openArtist = async (artist) => {
    setSelectedArtist(artist);
    setLoadingArtist(true);
    setArtistAlbums([]);
    setArtistSingles([]);
    try {
      const res = await fetch(
        "/api/deezer-artist?id=" + artist.artistId + "&name=" + encodeURIComponent(artist.name)
      );
      const data = await res.json();
      setArtistAlbums(data.albums || []);
      setArtistSingles(data.singles || []);
    } catch (err) {
      setArtistAlbums([]);
      setArtistSingles([]);
    } finally {
      setLoadingArtist(false);
    }
  };

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

  const handleRatingSaved = (itemId, value) => {
    setMyRatings((prev) => Object.assign({}, prev, { [itemId]: value }));
    setRatingItem(null);
  };

  const handleAlbumSaved = (itemId, value) => {
    setMyRatings((prev) => Object.assign({}, prev, { [itemId]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  const displayedResults = activeFilter
    ? results.filter((r) => r.kind === activeFilter)
    : results;

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      <div className="flex items-center justify-between mb-5">
        <Logo size={40} />
        <div className="w-9 h-9 rounded-full bg-mtgold text-black font-bold text-sm flex items-center justify-center">
          {profile && profile.pseudo ? profile.pseudo.slice(0, 1).toUpperCase() : ""}
        </div>
      </div>

      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 mb-6">
        <p className="text-base font-extrabold mb-0.5">Salut, {profile ? profile.pseudo : ""} 👋</p>
        <p className="text-xs text-zinc-400 mb-4">Qu&apos;est-ce qu&apos;on ecoute aujourd&apos;hui ?</p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un album, un titre, un artiste..."
            className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-mtgold text-black rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {searching ? "..." : "Go"}
          </button>
        </form>
      </div>

      {searchError ? <p className="text-red-400 text-sm mb-6">{searchError}</p> : null}

      {results.length > 0 ? (
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveFilter(activeFilter === "artist" ? null : "artist")}
            className={
              "flex-1 rounded-full py-2 text-xs font-bold transition-colors " +
              (activeFilter === "artist" ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-300")
            }
          >
            Artistes
          </button>
          <button
            onClick={() => setActiveFilter(activeFilter === "album" ? null : "album")}
            className={
              "flex-1 rounded-full py-2 text-xs font-bold transition-colors " +
              (activeFilter === "album" ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-300")
            }
          >
            Albums
          </button>
          <button
            onClick={() => setActiveFilter(activeFilter === "track" ? null : "track")}
            className={
              "flex-1 rounded-full py-2 text-xs font-bold transition-colors " +
              (activeFilter === "track" ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-300")
            }
          >
            Singles
          </button>
        </div>
      ) : null}

      {displayedResults.length > 0 ? (
        <div className="flex flex-col gap-3 mb-8">
          {displayedResults.map((item) => {
            if (item.kind === "artist") {
              return (
                <div
                  key={item.id}
                  onClick={() => openArtist(item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {item.pictureUrl ? (
                    <img src={item.pictureUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
                    <span className="bg-white/10 text-zinc-300 text-[10px] font-bold rounded px-1.5 py-0.5">
                      ARTISTE
                    </span>
                  </div>
                </div>
              );
            }

            return (
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
                      {item.kind === "album" ? "ALBUM" : "SINGLE"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
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
                  <span className="text-mtgold text-xs font-bold flex-shrink-0">
                    {myRatings[item.id]}/{item.kind === "album" ? 10 : 5}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedArtist ? (
        <div className="fixed inset-0 bg-black z-30 overflow-y-auto max-w-md mx-auto">
          <div className="relative w-full" style={{ aspectRatio: "1 / 0.9" }}>
            {selectedArtist.pictureUrl ? (
              <img
                src={selectedArtist.pictureUrl.replace("medium", "big")}
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
            <button
              onClick={() => setSelectedArtist(null)}
              className="absolute top-6 left-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-xl"
            >
              ←
            </button>
            <div className="absolute bottom-4 left-4 right-4">
              {selectedArtist.nbFan ? (
                <p className="text-xs text-zinc-300 mb-1">
                  {selectedArtist.nbFan.toLocaleString("fr-FR")} fans
                </p>
              ) : null}
              <p className="text-3xl font-extrabold leading-tight">{selectedArtist.name}</p>
            </div>
          </div>

          <div className="px-4 pt-5 pb-10">
            <p className="text-lg font-extrabold mb-3">Albums</p>
            {loadingArtist ? <p className="text-zinc-400 text-sm">Chargement des albums...</p> : null}
            {!loadingArtist && artistAlbums.length === 0 ? (
              <p className="text-zinc-400 text-sm">Aucun album trouve pour cet artiste.</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              {artistAlbums.map((item) => (
                <div key={item.id} className="cursor-pointer" onClick={() => openItem(item)}>
                  <div className="relative">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt="" className="w-full aspect-square rounded-xl object-cover" />
                    ) : (
                      <div className="w-full aspect-square rounded-xl bg-zinc-800" />
                    )}
                    <span className="absolute top-2 left-2 bg-mtgold text-black text-[10px] font-bold rounded px-1.5 py-0.5">
                      ALBUM
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

            {artistSingles.length > 0 ? (
              <>
                <p className="text-lg font-extrabold mb-3 mt-8">Singles</p>
                <div className="flex flex-col gap-3">
                  {artistSingles.map((item) => (
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
        </div>
      ) : null}

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={ratingItem ? myRatings[ratingItem.id] : undefined}
        onClose={() => setRatingItem(null)}
        onSaved={handleRatingSaved}
      />

      <AlbumDetail
        item={albumItem}
        userId={userId}
        onClose={() => setAlbumItem(null)}
        onSaved={handleAlbumSaved}
      />

      <BottomNav />
    </div>
  );
}
