"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import AlbumDetail from "@/components/AlbumDetail";

export default function StatsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [albumRatings, setAlbumRatings] = useState([]);
  const [tracksCount, setTracksCount] = useState(0);
  const [bucketListOpen, setBucketListOpen] = useState(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [albumItem, setAlbumItem] = useState(null);

  const loadStats = async (uid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("album_ratings")
      .select("rating, catalog_items(*)")
      .eq("user_id", uid);

    const list = (data || [])
      .filter((r) => r.catalog_items)
      .map((r) => ({ rating: r.rating, item: r.catalog_items }));

    const albums = list.filter((r) => r.item.type === "album");
    const singles = list.filter((r) => r.item.type === "single");

    setAlbumRatings(albums);
    setTracksCount(singles.length);
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

  const handleAlbumSaved = async () => {
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

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <p className="text-lg font-extrabold mb-5">Statistiques</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/[0.04] rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-1">Albums notes</p>
          <p className="text-2xl font-extrabold text-mtgold">{albumRatings.length}</p>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-1">Titres notes</p>
          <p className="text-2xl font-extrabold text-mtgold">{tracksCount}</p>
        </div>

        {best && (
          <div
            onClick={() => setRankingOpen(true)}
            className="bg-white/[0.04] rounded-xl p-4 col-span-2 cursor-pointer"
          >
            <p className="text-xs text-zinc-400 mb-2">Album prefere</p>
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
      </div>

      <p className="text-sm font-bold text-zinc-300 mb-3">Repartition de tes notes d&apos;albums</p>
      <div className="flex flex-col gap-1.5 mb-8">
        {buckets.map(({ n, items }) => (
          <div
            key={n}
            onClick={() =>
              items.length > 0 &&
              setBucketListOpen({ n, items: [...items].sort((a, b) => b.rating - a.rating) })
            }
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

      {rankingOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end z-30"
          onClick={() => setRankingOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-md mx-auto rounded-t-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Tes albums preferes</p>
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
                    <p className="text-sm font-medium truncate">{r.item.title}</p>
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
          className="fixed inset-0 bg-black/70 flex items-end z-30"
          onClick={() => setBucketListOpen(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-md mx-auto rounded-t-2xl p-6 max-h-[75vh] overflow-y-auto"
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
            <div className="flex flex-col gap-3">
              {bucketListOpen.items.map((r) => (
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
                    <p className="text-sm font-medium truncate">{r.item.title}</p>
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

      <BottomNav />
    </div>
  );
}
