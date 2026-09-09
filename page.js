"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import AlbumDetail from "@/components/AlbumDetail";
import RatingSheet from "@/components/RatingSheet";
import useBackButtonClose from "@/hooks/useBackButtonClose";

export default function StatsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [albumRatings, setAlbumRatings] = useState([]); // { rating, updatedAt, item }
  const [singleRatings, setSingleRatings] = useState([]);
  const [bucketListOpen, setBucketListOpen] = useState(null);
  const [singleBucketListOpen, setSingleBucketListOpen] = useState(null);
  const [bucketSort, setBucketSort] = useState("best");
  const [rankingOpen, setRankingOpen] = useState(false);
  const [genreRankingOpen, setGenreRankingOpen] = useState(false);
  const [genreAlbumsOpen, setGenreAlbumsOpen] = useState(null);
  const [albumItem, setAlbumItem] = useState(null);
  const [ratingItem, setRatingItem] = useState(null);

  const [statsListOpen, setStatsListOpen] = useState(null); // "albums" | "singles" | "artists" | null
  const [statsSort, setStatsSort] = useState("recent");

  useBackButtonClose(!!albumItem, () => setAlbumItem(null));
  useBackButtonClose(!!ratingItem, () => setRatingItem(null));
  useBackButtonClose(!!statsListOpen, () => setStatsListOpen(null));

  const loadStats = async (uid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("album_ratings")
      .select("rating, updated_at, catalog_items(*)")
      .eq("user_id", uid);

    const list = (data || [])
      .filter((r) => r.catalog_items)
      .map((r) => ({ rating: r.rating, updatedAt: r.updated_at, item: r.catalog_items }));

    setAlbumRatings(list.filter((r) => r.item.type === "album"));
    setSingleRatings(list.filter((r) => r.item.type === "single"));
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      await loadStats(session.user.id);
      setLoading(false);
    });
  }, [router]);

  const openAlbum = (catalogItem) => {
    setAlbumItem({
      id: catalogItem.id,
      type: "album",
      title: catalogItem.title,
      artist: catalogItem.artist,
      coverUrl: catalogItem.cover_url,
      deezerId: catalogItem.deezer_id,
    });
  };

  const openSingle = (catalogItem, rating) => {
    setRatingItem({
      id: catalogItem.id,
      type: "single",
      title: catalogItem.title,
      artist: catalogItem.artist,
      coverUrl: catalogItem.cover_url,
      deezerId: catalogItem.deezer_id,
      previewUrl: catalogItem.preview_url,
    });
  };

  const handleAlbumSaved = async () => {
    if (userId) await loadStats(userId);
  };
  const handleSingleSaved = async () => {
    setRatingItem(null);
    if (userId) await loadStats(userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  const ranking = [...albumRatings].sort((a, b) => b.rating - a.rating);
  const best = ranking[0];

  const buckets = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => {
    const items = ranking.filter((r) => Math.floor(r.rating) === n);
    return { n, items };
  });
  const maxBucketCount = Math.max(1, ...buckets.map((b) => b.items.length));

  const singleBuckets = [5, 4, 3, 2, 1].map((n) => {
    const items = singleRatings.filter((r) => Math.floor(r.rating) === n);
    return { n, items };
  });
  const maxSingleBucketCount = Math.max(1, ...singleBuckets.map((b) => b.items.length));

  const genreCounts = {};
  albumRatings.forEach((r) => {
    const g = r.item.genre;
    if (!g) return;
    if (!genreCounts[g]) genreCounts[g] = [];
    genreCounts[g].push(r);
  });
  const genreRanking = Object.entries(genreCounts)
    .map(([genre, items]) => ({ genre, items }))
    .sort((a, b) => b.items.length - a.items.length);
  const topGenre = genreRanking[0];

  // Artistes écoutés : regroupement albums + singles par nom d'artiste
  const artistMap = {};
  [...albumRatings, ...singleRatings].forEach((r) => {
    const name = r.item.artist;
    if (!artistMap[name]) artistMap[name] = { name, count: 0, lastRated: r.updatedAt };
    artistMap[name].count += 1;
    if (new Date(r.updatedAt) > new Date(artistMap[name].lastRated)) {
      artistMap[name].lastRated = r.updatedAt;
    }
  });
  const artistsList = Object.values(artistMap);

  const sortItems = (items) => {
    const arr = [...items];
    if (statsSort === "recent") return arr.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (statsSort === "oldest") return arr.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    if (statsSort === "best") return arr.sort((a, b) => b.rating - a.rating);
    if (statsSort === "worst") return arr.sort((a, b) => a.rating - b.rating);
    return arr;
  };
  const sortArtists = (items) => {
    const arr = [...items];
    if (statsSort === "recent") return arr.sort((a, b) => new Date(b.lastRated) - new Date(a.lastRated));
    if (statsSort === "oldest") return arr.sort((a, b) => new Date(a.lastRated) - new Date(b.lastRated));
    if (statsSort === "most") return arr.sort((a, b) => b.count - a.count);
    if (statsSort === "least") return arr.sort((a, b) => a.count - b.count);
    return arr;
  };

  const sortBucketItems = (items) => {
    const arr = [...items];
    if (bucketSort === "recent") return arr.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (bucketSort === "oldest") return arr.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    if (bucketSort === "best") return arr.sort((a, b) => b.rating - a.rating);
    if (bucketSort === "worst") return arr.sort((a, b) => a.rating - b.rating);
    return arr;
  };

  const openStatsList = (type) => {
    setStatsSort(type === "artists" ? "most" : "recent");
    setStatsListOpen(type);
  };

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto mt-page-enter">
      <p className="text-lg font-extrabold mb-5">Statistiques</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div
          onClick={() => albumRatings.length > 0 && openStatsList("albums")}
          className="bg-white/[0.04] rounded-xl p-4 cursor-pointer"
        >
          <p className="text-xs text-zinc-400 mb-1">Albums notés</p>
          <p className="text-2xl font-extrabold text-mtgold">{albumRatings.length}</p>
        </div>
        <div
          onClick={() => singleRatings.length > 0 && openStatsList("singles")}
          className="bg-white/[0.04] rounded-xl p-4 cursor-pointer"
        >
          <p className="text-xs text-zinc-400 mb-1">Titres notés</p>
          <p className="text-2xl font-extrabold text-mtgold">{singleRatings.length}</p>
        </div>
        <div
          onClick={() => artistsList.length > 0 && openStatsList("artists")}
          className="bg-white/[0.04] rounded-xl p-4 col-span-2 cursor-pointer"
        >
          <p className="text-xs text-zinc-400 mb-1">Artistes écoutés</p>
          <p className="text-2xl font-extrabold text-mtgold">{artistsList.length}</p>
        </div>

        {best && (
          <div
            onClick={() => setRankingOpen(true)}
            className="bg-white/[0.04] rounded-xl p-4 col-span-2 cursor-pointer"
          >
            <p className="text-xs text-zinc-400 mb-2">Album préféré</p>
            <div className="flex items-center gap-3">
              {best.item.cover_url ? (
                <img src={best.item.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-zinc-800" />
              )}
              <div>
                <p className="text-sm font-bold">{best.item.title}</p>
                <p className="text-xs text-mtgold">{best.rating}/10</p>
              </div>
            </div>
          </div>
        )}

        {topGenre && (
          <div
            onClick={() => setGenreRankingOpen(true)}
            className="bg-white/[0.04] rounded-xl p-4 col-span-2 cursor-pointer"
          >
            <p className="text-xs text-zinc-400 mb-2">Genre préféré</p>
            <p className="text-lg font-extrabold text-mtgold">{topGenre.genre}</p>
            <p className="text-xs text-zinc-400">
              {topGenre.items.length} album{topGenre.items.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <p className="text-sm font-bold text-zinc-300 mb-3">Répartition de tes notes d&apos;albums</p>
      <div className="flex flex-col gap-1.5 mb-8">
        {buckets.map(({ n, items }) => (
          <div
            key={n}
            onClick={() => {
              if (items.length === 0) return;
              setBucketSort("best");
              setBucketListOpen({ n, items });
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-xs text-zinc-500 w-4">{n}</span>
            <div className="flex-1 bg-white/10 rounded h-2">
              <div
                className="bg-mtgold rounded h-2"
                style={{ width: `${(items.length / maxBucketCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 w-4">{items.length}</span>
          </div>
        ))}
      </div>

      <p className="text-sm font-bold text-zinc-300 mb-3">Répartition de tes notes de singles</p>
      <div className="flex flex-col gap-1.5 mb-8">
        {singleBuckets.map(({ n, items }) => (
          <div
            key={n}
            onClick={() => {
              if (items.length === 0) return;
              setBucketSort("best");
              setSingleBucketListOpen({ n, items });
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-xs text-zinc-500 w-4">{n}</span>
            <div className="flex-1 bg-white/10 rounded h-2">
              <div
                className="bg-mtgold rounded h-2"
                style={{ width: `${(items.length / maxSingleBucketCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500 w-4">{items.length}</span>
          </div>
        ))}
      </div>

      {/* Pop-up Albums / Titres / Artistes écoutés, avec tri */}
      {statsListOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setStatsListOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">
                {statsListOpen === "albums" ? "Tes albums notés" : statsListOpen === "singles" ? "Tes titres notés" : "Tes artistes écoutés"}
              </p>
              <button
                onClick={() => setStatsListOpen(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>

            <select
              value={statsSort}
              onChange={(e) => setStatsSort(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-xs mb-4 outline-none"
            >
              {statsListOpen === "artists" ? (
                <>
                  <option value="most">Plus écouté d&apos;abord</option>
                  <option value="least">Moins écouté d&apos;abord</option>
                  <option value="recent">Plus récemment ajouté</option>
                  <option value="oldest">Plus ancien</option>
                </>
              ) : (
                <>
                  <option value="recent">Plus récemment ajouté</option>
                  <option value="oldest">Plus ancien</option>
                  <option value="best">Meilleure note d&apos;abord</option>
                  <option value="worst">Moins bonne note d&apos;abord</option>
                </>
              )}
            </select>

            <div className="flex flex-col gap-3">
              {statsListOpen === "albums" &&
                sortItems(albumRatings).map((r) => (
                  <div
                    key={r.item.id}
                    onClick={() => {
                      setStatsListOpen(null);
                      openAlbum(r.item);
                    }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {r.item.cover_url ? (
                      <img src={r.item.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{r.item.title}</p>
                      <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                        {r.item.release_type === "ep" ? "EP" : r.item.release_type === "mixtape" ? "MIXTAPE" : "ALBUM"}
                      </span>
                    </div>
                      <p className="text-xs text-zinc-400 truncate">{r.item.artist}</p>
                    </div>
                    <span className="text-mtgold text-sm font-bold flex-shrink-0">{r.rating}</span>
                  </div>
                ))}

              {statsListOpen === "singles" &&
                sortItems(singleRatings).map((r) => (
                  <div
                    key={r.item.id}
                    onClick={() => {
                      setStatsListOpen(null);
                      openSingle(r.item, r.rating);
                    }}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {r.item.cover_url ? (
                      <img src={r.item.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{r.item.title}</p>
                      <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                        {r.item.release_type === "ep" ? "EP" : r.item.release_type === "mixtape" ? "MIXTAPE" : "ALBUM"}
                      </span>
                    </div>
                      <p className="text-xs text-zinc-400 truncate">{r.item.artist}</p>
                    </div>
                    <span className="text-mtgold text-sm font-bold flex-shrink-0">{r.rating}</span>
                  </div>
                ))}

              {statsListOpen === "artists" &&
                sortArtists(artistsList).map((a) => (
                  <div
                    key={a.name}
                    onClick={() => {
                      setStatsListOpen(null);
                      router.push(`/home?q=${encodeURIComponent(a.name)}`);
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span className="text-sm font-medium">{a.name}</span>
                    <span className="text-mtgold text-xs font-bold">
                      {a.count} titre{a.count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {rankingOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setRankingOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Tes albums préférés</p>
              <button
                onClick={() => setRankingOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {ranking.map((r, i) => (
                <div
                  key={r.item.id}
                  onClick={() => openAlbum(r.item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <span className="text-xs text-zinc-500 w-5">{i + 1}</span>
                  {r.item.cover_url ? (
                    <img src={r.item.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{r.item.title}</p>
                      <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                        {r.item.release_type === "ep" ? "EP" : r.item.release_type === "mixtape" ? "MIXTAPE" : "ALBUM"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{r.item.artist}</p>
                  </div>
                  <span className="text-mtgold text-sm font-bold flex-shrink-0">{r.rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {bucketListOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setBucketListOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Notes de {bucketListOpen.n}</p>
              <button
                onClick={() => setBucketListOpen(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>

            <select
              value={bucketSort}
              onChange={(e) => setBucketSort(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-xs mb-4 outline-none"
            >
              <option value="best">Meilleure note d&apos;abord</option>
              <option value="worst">Moins bonne note d&apos;abord</option>
              <option value="recent">Plus récemment ajouté</option>
              <option value="oldest">Plus ancien</option>
            </select>

            <div className="flex flex-col gap-3">
              {sortBucketItems(bucketListOpen.items).map((r) => (
                <div
                  key={r.item.id}
                  onClick={() => openAlbum(r.item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {r.item.cover_url ? (
                    <img src={r.item.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{r.item.title}</p>
                      <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                        {r.item.release_type === "ep" ? "EP" : r.item.release_type === "mixtape" ? "MIXTAPE" : "ALBUM"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{r.item.artist}</p>
                  </div>
                  <span className="text-mtgold text-sm font-bold flex-shrink-0">{r.rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {singleBucketListOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setSingleBucketListOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Notes de {singleBucketListOpen.n}</p>
              <button
                onClick={() => setSingleBucketListOpen(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>

            <select
              value={bucketSort}
              onChange={(e) => setBucketSort(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-xs mb-4 outline-none"
            >
              <option value="best">Meilleure note d&apos;abord</option>
              <option value="worst">Moins bonne note d&apos;abord</option>
              <option value="recent">Plus récemment ajouté</option>
              <option value="oldest">Plus ancien</option>
            </select>

            <div className="flex flex-col gap-3">
              {sortBucketItems(singleBucketListOpen.items).map((r) => (
                <div
                  key={r.item.id}
                  onClick={() => {
                    setSingleBucketListOpen(null);
                    openSingle(r.item, r.rating);
                  }}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {r.item.cover_url ? (
                    <img src={r.item.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{r.item.title}</p>
                      <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                        {r.item.release_type === "ep" ? "EP" : r.item.release_type === "mixtape" ? "MIXTAPE" : "ALBUM"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{r.item.artist}</p>
                  </div>
                  <span className="text-mtgold text-sm font-bold flex-shrink-0">{r.rating}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {genreRankingOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setGenreRankingOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Tes genres préférés</p>
              <button
                onClick={() => setGenreRankingOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {genreRanking.map((g) => (
                <div
                  key={g.genre}
                  onClick={() => {
                    setGenreRankingOpen(false);
                    setGenreAlbumsOpen(g);
                  }}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="text-sm font-medium">{g.genre}</span>
                  <span className="text-mtgold text-sm font-bold">{g.items.length}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {genreAlbumsOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setGenreAlbumsOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">{genreAlbumsOpen.genre}</p>
              <button
                onClick={() => setGenreAlbumsOpen(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {genreAlbumsOpen.items
                .sort((a, b) => b.rating - a.rating)
                .map((r) => (
                  <div
                    key={r.item.id}
                    onClick={() => openAlbum(r.item)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {r.item.cover_url ? (
                      <img src={r.item.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{r.item.title}</p>
                      <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                        {r.item.release_type === "ep" ? "EP" : r.item.release_type === "mixtape" ? "MIXTAPE" : "ALBUM"}
                      </span>
                    </div>
                      <p className="text-xs text-zinc-400 truncate">{r.item.artist}</p>
                    </div>
                    <span className="text-mtgold text-sm font-bold flex-shrink-0">{r.rating}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <AlbumDetail
        item={albumItem}
        userId={userId}
        onClose={() => setAlbumItem(null)}
        onSaved={handleAlbumSaved}
      />

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={undefined}
        onClose={() => setRatingItem(null)}
        onSaved={handleSingleSaved}
      />

      <BottomNav />
    </div>
  );
}
