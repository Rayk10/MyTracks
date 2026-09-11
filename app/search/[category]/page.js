"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import RatingSheet from "@/components/RatingSheet";
import AlbumDetail from "@/components/AlbumDetail";

const CONFIG = {
  selection: { title: "Ta sélection", type: "personal" },
  nouveautes: { title: "Dernières sorties", type: "chart" },
  hiphop: { title: "Hip-Hop", type: "genre", genre: "Hip Hop" },
  pop: { title: "Pop", type: "genre", genre: "Pop" },
  rock: { title: "Rock", type: "genre", genre: "Rock" },
  electro: { title: "Electro", type: "genre", genre: "Electro" },
  "community-tracks": { title: "Titres préférés de la communauté", type: "community", itemType: "single" },
  "community-albums": { title: "Projets préférés de la communauté", type: "community", itemType: "album" },
};

export default function SearchCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const category = params.category;
  const config = CONFIG[category] || { title: "Resultats", type: "chart" };
  const hasSingles = config.itemType === "single";

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [myRatings, setMyRatings] = useState({});
  const [ratingItem, setRatingItem] = useState(null);
  const [albumItem, setAlbumItem] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "album" | "ep" | "mixtape"

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);

      const { data: ratingsData } = await supabase
        .from("album_ratings")
        .select("item_id, rating")
        .eq("user_id", session.user.id);
      const map = {};
      (ratingsData || []).forEach((r) => (map[r.item_id] = r.rating));
      setMyRatings(map);

      if (config.type === "community") {
        const { data } = await supabase
          .from("album_ratings")
          .select("rating, catalog_items(*)");

        const grouped = new Map();
        (data || [])
          .filter((r) => r.catalog_items && r.catalog_items.type === config.itemType)
          .forEach((r) => {
            const id = r.catalog_items.id;
            if (!grouped.has(id)) {
              grouped.set(id, { item: r.catalog_items, sum: 0, count: 0 });
            }
            const g = grouped.get(id);
            g.sum += r.rating;
            g.count += 1;
          });

        const ranked = [...grouped.values()]
          .map((g) => ({ item: g.item, avg: g.sum / g.count, count: g.count }))
          .sort((a, b) => b.avg - a.avg || b.count - a.count)
          .slice(0, 20);

        setItems(
          ranked.map((r) => ({
            id: r.item.id,
            type: r.item.type,
            releaseType: r.item.release_type,
            title: r.item.title,
            artist: r.item.artist,
            coverUrl: r.item.cover_url,
            deezerId: r.item.deezer_id,
            previewUrl: r.item.preview_url,
            communityAvg: r.avg,
            communityCount: r.count,
          }))
        );
        setLoading(false);
        return;
      }

      if (config.type === "genre") {
        const res = await fetch("/api/deezer-genre?name=" + encodeURIComponent(config.genre));
        const data = await res.json();
        setItems(data.albums || []);
        setLoading(false);
        return;
      }

      if (config.type === "personal") {
        const { data: ratedData } = await supabase
          .from("album_ratings")
          .select("catalog_items(genre)")
          .eq("user_id", session.user.id);
        const genreCounts = {};
        (ratedData || [])
          .filter((r) => r.catalog_items && r.catalog_items.genre)
          .forEach((r) => {
            const g = r.catalog_items.genre;
            genreCounts[g] = (genreCounts[g] || 0) + 1;
          });
        const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0];

        if (topGenre) {
          const res = await fetch("/api/deezer-genre?name=" + encodeURIComponent(topGenre[0]));
          const data = await res.json();
          setItems(data.albums || []);
        } else {
          const res = await fetch("/api/deezer-chart");
          const data = await res.json();
          setItems(data.albums || []);
        }
        setLoading(false);
        return;
      }

      // chart (Dernières sorties, approxime avec les tendances Deezer)
      const res = await fetch("/api/deezer-chart");
      const data = await res.json();
      setItems(data.albums || []);
      setLoading(false);
    };

    load();
  }, [category, router]);

  const openItem = (item) => {
    if (item.type === "album") {
      setAlbumItem(item);
    } else {
      setRatingItem(item);
    }
  };

  const handleRatingSaved = (itemId, value) => {
    setMyRatings((prev) => Object.assign({}, prev, { [itemId]: value }));
    setRatingItem(null);
  };

  const handleAlbumSaved = (itemId, value) => {
    setMyRatings((prev) => Object.assign({}, prev, { [itemId]: value }));
  };

  const displayedItems = hasSingles
    ? items
    : typeFilter === "all"
    ? items
    : items.filter((it) => (it.releaseType || "album") === typeFilter);

  return (
    <div className="min-h-screen px-4 pt-6 pb-16 max-w-md mx-auto">
      <div className="mt-page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/search")} className="text-xl">
          ←
        </button>
        <p className="font-extrabold text-lg">{config.title}</p>
      </div>

      {!hasSingles && items.length > 0 && (
        <div className="flex gap-2 mb-5">
          {[
            { key: "all", label: "Tout" },
            { key: "album", label: "Album" },
            { key: "ep", label: "EP" },
            { key: "mixtape", label: "Mixtape" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`flex-1 rounded-full py-1.5 text-[11px] font-bold ${
                typeFilter === f.key ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-zinc-400 text-sm">Chargement...</p>}
      {!loading && displayedItems.length === 0 && (
        <p className="text-zinc-400 text-sm">Rien à afficher pour l&apos;instant.</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {displayedItems.map((item) => (
          <div key={item.id} className="cursor-pointer" onClick={() => openItem(item)}>
            <div className="relative">
              {item.coverUrl ? (
                <img src={item.coverUrl} alt="" className="w-full aspect-square rounded-xl object-cover" />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-zinc-800" />
              )}
              <span className="absolute top-2 left-2 bg-mtgold text-black text-[10px] font-bold rounded px-1.5 py-0.5">
                {item.kind === "track" || item.type === "single"
                  ? "SINGLE"
                  : item.releaseType === "ep"
                  ? "EP"
                  : item.releaseType === "mixtape"
                  ? "MIXTAPE"
                  : "ALBUM"}
              </span>
              {item.communityAvg !== undefined ? (
                <span className="absolute bottom-2 right-2 bg-black/80 text-mtgold text-xs font-bold rounded px-1.5 py-0.5">
                  {item.communityAvg.toFixed(1)}
                </span>
              ) : myRatings[item.id] !== undefined ? (
                <span className="absolute bottom-2 right-2 bg-black/80 text-mtgold text-xs font-bold rounded px-1.5 py-0.5">
                  {myRatings[item.id]}
                </span>
              ) : null}
            </div>
            <p className="text-sm font-semibold mt-1.5 truncate">{item.title}</p>
            <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
            {item.communityCount ? (
              <p className="text-[10px] text-zinc-500">{item.communityCount} note{item.communityCount > 1 ? "s" : ""}</p>
            ) : null}
          </div>
        ))}
      </div>
      </div>

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
    </div>
  );
}
