"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import BottomNav from "@/components/BottomNav";
import RatingSheet from "@/components/RatingSheet";

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ albums: [], tracks: [], artists: [] });
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const [ratingItem, setRatingItem] = useState(null);
  const [myRatings, setMyRatings] = useState({});

  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistAlbums, setArtistAlbums] = useState([]);
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
    try {
      const res = await fetch(`/api/deezer-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
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
    try {
      const res = await fetch(`/api/deezer-artist?id=${artist.id}`);
      const data = await res.json();
      setArtistAlbums(data.albums || []);
    } catch (err) {
      setArtistAlbums([]);
    } finally {
      setLoadingArtist(false);
    }
  };

  const togglePreview = (item) => {
    if (!item.previewUrl) return;
    if (playingId === item.id) {
      audioRef.current?.pause();
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
    setMyRatings((prev) => ({ ...prev, [itemId]: value }));
    setRatingItem(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      <div className="flex items-center justify-between mb-5">
        <Logo size={40} />
        <div className="w-9 h-9 rounded-full bg-mtgold text-black font-bold text-sm flex items-center justify-center">
          {profile?.pseudo?.slice(0, 1).toUpperCase()}
        </div>
      </div>

      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 mb-6">
        <p className="text-base font-extrabold mb-0.5">Salut, {profile?.pseudo} 👋</p>
        <p className="text-xs text-zinc-400 mb-4">Qu&apos;est-ce qu&apos;on ecoute aujourd&apos;hui ?</p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un album, un titre..."
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

      {searchError && <p className="text-red-400 text-sm mb-6">{searchError}</p>}

      {results.artists && results.artists.length > 0 && (
        <div className="mb-8">
          <p className="text-lg font-extrabold mb-3 -tracking-wide">Artistes</p>
          <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
            {results.artists.map((artist) => (
              <div
                key={artist.id}
                onClick={() => openArtist(artist)}
                className="flex flex-col items-center flex-shrink-0 w-20 cursor-pointer"
              >
                {artist.pictureUrl ? (
                  <img src={artist.pictureUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-zinc-800" />
                )}
                <p className="text-xs font-semibold mt-1.5 text-center truncate w-full">{artist.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.albums.length > 0 && (
        <div className="mb-8">
          <p className="text-lg font-extrabold mb-3 -tracking-wide">Albums</p>
          <div className="grid grid-cols-2 gap-3">
            {results.albums.map((item) => (
              <div key={item.id} className="cursor-pointer" onClick={() => setRatingItem(item)}>
                <div className="relative">
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt="" className="w-full aspect-square rounded-xl object-cover" />
                  ) : (
                    <div className="w-full aspect-square rounded-xl bg-zinc-800" />
                  )}
                  <span className="absolute top-2 left-2 bg-mtgold text-black text-[10px] font-bold rounded px-1.5 py-0.5">
                    ALBUM
                  </span>
                  {myRatings[item.id] !== undefined && (
                    <span className="absolute bottom-2 right-2 bg-black/80 text-mtgold text-xs font-bold rounded px-1.5 py-0.5">
                      {myRatings[item.id]}/10
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold mt-1.5 truncate">{item.title}</p>
                <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.tracks.length > 0 && (
        <div className="mb-8">
          <p className="text-lg font-extrabold mb-3 -tracking-wide">Titres</p>
          <div className="flex flex-col gap-3">
            {results.tracks.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0" onClick={() => setRatingItem(item)}>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <span className="bg-mtgold text-black text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                      SINGLE
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
                </div>
                {item.previewUrl && (
                  <button
                    onClick={() => togglePreview(item)}
                    className="w-8 h-8 rounded-full bg-mtgold text-black flex items-center justify-center flex-shrink-0 text-xs active:scale-90 transition-transform"
                  >
                    {playingId === item.id ? "❚❚" : "▶"}
                  </button>
                )}
                {myRatings[item.id] !== undefined && (
                  <span className="text-mtgold text-xs font-bold flex-shrink-0">{myRatings[item.id]}/5</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedArtist && (
        <div className="fixed inset-0 bg-black z-30 overflow-y-auto max-w-md mx-auto">
          <div className="flex items-center gap-3 px-4 pt-6 pb-4">
            <button onClick={() => setSelectedArtist(null)} className="text-xl">
              ←
            </button>
            <div className="flex items-center gap-3">
              {selectedArtist.pictureUrl && (
                <img src={selectedArtist.pictureUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
              )}
              <p className="font-bold text-base">{selectedArtist.name}</p>
            </div>
          </div>

          <div className="px-4 pb-10">
            {loadingArtist && <p className="text-zinc-400 text-sm">Chargement des albums...</p>}
            {!loadingArtist && artistAlbums.length === 0 && (
              <p className="text-zinc-400 text-sm">Aucun album trouve pour cet artiste.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {artistAlbums.map((item) => (
                <div key={item.id} className="cursor-pointer" onClick={() => { setSelectedArtist(null); setRatingItem(item); }}>
                  <div className="relative">
                    {item.coverUrl ? (
                      <img src={item.coverUrl} alt="" className="w-full aspect-square rounded-xl object-cover" />
                    ) : (
                      <div className="w-full aspect-square rounded-xl bg-zinc-800" />
                    )}
                    <span className="absolute top-2 left-2 bg-mtgold text-black text-[10px] font-bold rounded px-1.5 py-0.5">
                      ALBUM
                    </span>
                    {myRatings[item.id] !== undefined && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-mtgold text-xs font-bold rounded px-1.5 py-0.5">
                        {myRatings[item.id]}/10
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-1.5 truncate">{item.title}</p>
                  {item.releaseDate && <p className="text-xs text-zinc-400 truncate">{item.releaseDate.slice(0, 4)}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={ratingItem ? myRatings[ratingItem.id] : undefined}
        onClose={() => setRatingItem(null)}
        onSaved={handleRatingSaved}
      />

      <BottomNav />
    </div>
  );
}
