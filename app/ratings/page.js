"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import RatingSheet from "@/components/RatingSheet";
import AlbumDetail from "@/components/AlbumDetail";
import ListCoverMosaic from "@/components/ListCoverMosaic";

export default function RatingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratedItems, setRatedItems] = useState([]);
  const [lists, setLists] = useState([]);
  const [subTab, setSubTab] = useState("albums");
  const [sortMode, setSortMode] = useState("best");
  const [ratingItem, setRatingItem] = useState(null);
  const [albumItem, setAlbumItem] = useState(null);

  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");

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

  const loadLists = async (uid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("custom_lists")
      .select("id, name, custom_list_items(catalog_items(*))")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    const formatted = (data || []).map((l) => ({
      id: l.id,
      name: l.name,
      items: (l.custom_list_items || []).map((li) => li.catalog_items).filter(Boolean),
    }));
    setLists(formatted);
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
      await loadLists(session.user.id);
      setLoading(false);
    });
  }, [router]);

  const openItem = (item) => {
    if (item.type === "album") {
      setAlbumItem(item);
    } else {
      setRatingItem(item);
    }
  };

  const handleRatingSaved = async () => {
    setRatingItem(null);
    if (userId) await loadRatings(userId);
  };

  const handleAlbumSaved = async () => {
    if (userId) await loadRatings(userId);
  };

  const createList = async () => {
    if (!newListName.trim() || !userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("custom_lists")
      .insert({ user_id: userId, name: newListName.trim() })
      .select()
      .single();
    if (data) {
      setLists((prev) => [{ id: data.id, name: data.name, items: [] }, ...prev]);
    }
    setNewListName("");
    setCreatingList(false);
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
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto mt-page-enter">
      <p className="text-lg font-extrabold mb-4">Mes notes</p>

      <div className="flex gap-2 mb-4">
        {[
          { key: "albums", label: "Albums" },
          { key: "singles", label: "Singles" },
          { key: "lists", label: "Listes" },
        ].map((s) => (
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

      {subTab !== "lists" && (
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-xs mb-5 outline-none"
        >
          <option value="best">Meilleure note d&apos;abord</option>
          <option value="worst">Moins bonne note d&apos;abord</option>
          <option value="recent">Plus récent d&apos;abord</option>
          <option value="oldest">Plus ancien d&apos;abord</option>
        </select>
      )}

      {subTab !== "lists" && sorted.length === 0 && (
        <p className="text-zinc-400 text-sm">
          Tu n&apos;as encore rien noté dans cette catégorie. Va noter un {subTab === "albums" ? "album" : "titre"} depuis l&apos;accueil.
        </p>
      )}

      {subTab !== "lists" && (
        <div className="flex flex-col gap-3">
          {sorted.map((item) => (
            <div
              key={item.id}
              onClick={() => openItem(item)}
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
      )}

      {subTab === "lists" && (
        <>
          {!creatingList ? (
            <button
              onClick={() => setCreatingList(true)}
              className="w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-dashed border-zinc-600 rounded-xl py-3 mb-5 text-sm font-bold text-mtgold"
            >
              + Créer une liste
            </button>
          ) : (
            <div className="flex gap-2 mb-5">
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nom de la liste..."
                onKeyDown={(e) => e.key === "Enter" && createList()}
                className="flex-1 bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button onClick={createList} className="bg-mtgold text-black rounded-lg px-4 text-sm font-bold">
                Créer
              </button>
              <button
                onClick={() => {
                  setCreatingList(false);
                  setNewListName("");
                }}
                className="border border-zinc-700 rounded-lg px-3 text-sm text-zinc-400"
              >
                ×
              </button>
            </div>
          )}

          {lists.length === 0 && (
            <p className="text-zinc-400 text-sm">Tu n&apos;as encore aucune liste. Crée-en une pour commencer.</p>
          )}

          <div className="flex flex-col gap-3">
            {lists.map((list) => (
              <div
                key={list.id}
                onClick={() => router.push(`/lists/${list.id}`)}
                className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2 cursor-pointer"
              >
                <ListCoverMosaic items={list.items} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{list.name}</p>
                  <p className="text-xs text-zinc-400">
                    {list.items.length} titre{list.items.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={ratingItem ? ratingItem.rating : undefined}
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
