"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import RatingSheet from "@/components/RatingSheet";

export default function RatingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratedItems, setRatedItems] = useState([]);
  const [subTab, setSubTab] = useState("albums");
  const [sortMode, setSortMode] = useState("best");
  const [ratingItem, setRatingItem] = useState(null);

  const loadRatings = async (uid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("album_ratings")
      .select("rating, item_id, updated_at, catalog_items(*)")
      .eq("user_id", uid);

    const items = (data || [])
      .filter((r) => r.catalog_items)
      .map((r) => ({
        id: r.catalog_items.id,
        type: r.catalog_items.type,
        title: r.catalog_items.title,
        artist: r.catalog_items.artist,
        coverUrl: r.catalog_items.cover_url,
        deezerId: r.catalog_items.deezer_id,
        previewUrl: r.catalog_items.preview_url,
        rating: r.rating,
        updatedAt: r.updated_at,
      }));
    setRatedItems(items);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      await loadRatings(session.user.id);
      setLoading(false);
    });
  }, [router]);

  const handleRatingSaved = async (itemId, value) => {
    setRatingItem(null);
    if (userId) await loadRatings(userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  const filtered = ratedItems.filter((it) => (subTab === "albums" ? it.type === "album" : it.type === "single"));

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "best") return b.rating - a.rating;
    if (sortMode === "worst") return a.rating - b.rating;
    if (sortMode === "recent") return new Date(b.updatedAt) - new Date(a.updatedAt);
    if (sortMode === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
    return 0;
  });

  const maxScale = subTab === "albums" ? 10 : 5;

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <p className="text-lg font-extrabold mb-4">Mes notes</p>

      <div className="flex gap-2 mb-4">
        {[{ key: "albums", label: "Albums" }, { key: "singles", label: "Singles" }].map((s) => (
          <button
            key={s.key}
            onClick={() => setSubTab(s.key)}
            className={`flex-1 rounded-full py-2 text-xs font-bold ${
              subTab === s.key ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value)}
        className="w-full bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-xs mb-5 outline-none"
      >
        <option value="best">Meilleure note d&apos;abord</option>
        <option value="worst">Moins bonne note d&apos;abord</option>
        <option value="recent">Plus recent d&apos;abord</option>
        <option value="oldest">Plus ancien d&apos;abord</option>
      </select>

      {sorted.length === 0 && (
        <p className="text-zinc-400 text-sm">
          Tu n&apos;as encore rien note dans cette categorie. Va noter un {subTab === "albums" ? "album" : "titre"} depuis l&apos;accueil.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((item) => (
          <div
            key={item.id}
            onClick={() => setRatingItem(item)}
            className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2 cursor-pointer"
          >
            {item.coverUrl ? (
              <img src={item.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
            </div>
            <span className="text-mtgold text-sm font-bold flex-shrink-0">
              {item.rating}/{maxScale}
            </span>
          </div>
        ))}
      </div>

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={ratingItem ? ratingItem.rating : undefined}
        onClose={() => setRatingItem(null)}
        onSaved={handleRatingSaved}
      />

      <BottomNav />
    </div>
  );
}
