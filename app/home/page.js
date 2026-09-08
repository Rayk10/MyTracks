"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

export default function HomePage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ albums: [], tracks: [] });
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const [ratingItem, setRatingItem] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [savingRating, setSavingRating] = useState(false);
  const [myRatings, setMyRatings] = useState({});

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

  const openRating = (item) => {
    setRatingItem(item);
    setRatingValue(myRatings[item.id] || (item.type === "album" ? 5 : 2.5));
  };

  const saveRating = async () => {
    if (!ratingItem || !userId) return;
    setSavingRating(true);
    const supabase = createClient();

    await supabase.from("catalog_items").upsert({
      id: ratingItem.id,
      type: ratingItem.type,
      title: ratingItem.title,
      artist: ratingItem.artist,
      cover_url: ratingItem.coverUrl,
      deezer_id: String(ratingItem.deezerId),
      preview_url: ratingItem.previewUrl || null,
    });

    const { error } = await supabase.from("album_ratings").upsert({
      user_id: userId,
      item_id: ratingItem.id,
      rating: ratingValue,
    });

    setSavingRating(false);
    if (!error) {
      setMyRatings((prev) => ({ ...prev, [ratingItem.id]: ratingValue }));
      setRatingItem(null);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
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
        <button
          onClick={handleLogout}
          className="w-9 h-9 rounded-full bg-mtgold text-black font-bold text-sm flex items-center justify-center"
        >
          {profile?.pseudo?.slice(0, 1).toUpperCase()}
        </button>
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

      {results.albums.length > 0 && (
        <div className="mb-8">
          <p className="text-lg font-extrabold mb-3 -tracking-wide">Albums</p>
          <div className="grid grid-cols-2 gap-3">
            {results.albums.map((item) => (
              <div key={item.id} className="cursor-pointer" onClick={() => openRating(item)}>
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
                <div className="relative flex-shrink-0">
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800" />
                  )}
                </div>
                <div className="flex-1 min-w-0" onClick={() => openRating(item)}>
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

      {ratingItem && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end z-20"
          onClick={() => setRatingItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-md mx-auto rounded-t-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              {ratingItem.coverUrl && (
                <img src={ratingItem.coverUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <div>
                <p className="font-bold text-sm">{ratingItem.title}</p>
                <p className="text-xs text-zinc-400">{ratingItem.artist}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mb-2">
              Ta note {ratingItem.type === "album" ? "d'album, sur 10" : "de titre, sur 5"}
            </p>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl font-extrabold text-mtgold w-10">{ratingValue}</span>
              <input
                type="range"
                min={0.5}
                max={ratingItem.type === "album" ? 10 : 5}
                step={0.5}
                value={ratingValue}
                onChange={(e) => setRatingValue(Number(e.target.value))}
                className="flex-1 accent-mtgold"
              />
            </div>

            <button
              onClick={saveRating}
              disabled={savingRating}
              className="w-full bg-mtgold text-black rounded-full py-3 font-bold disabled:opacity-50 active:scale-95 transition-transform"
            >
              {savingRating ? "..." : "ENREGISTRER LA NOTE"}
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-3 max-w-md mx-auto">
        <div className="flex items-center justify-around bg-zinc-900/95 backdrop-blur rounded-full px-3 py-2 shadow-lg">
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-mtgold flex items-center justify-center -mt-3 shadow-[0_4px_16px_rgba(242,194,48,0.5)]">
              <span className="text-black">⌂</span>
            </div>
          </div>
          <span className="text-zinc-600 text-lg">🔍</span>
          <span className="text-zinc-600 text-lg">★</span>
          <span className="text-zinc-600 text-lg">📊</span>
          <span className="text-zinc-600 text-lg">👤</span>
        </div>
      </div>
    </div>
  );
}
