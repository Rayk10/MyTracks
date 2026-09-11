"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";
import RatingSheet from "@/components/RatingSheet";
import AlbumDetail from "@/components/AlbumDetail";
import ListCoverMosaic from "@/components/ListCoverMosaic";
import CreateItemModal from "@/components/CreateItemModal";
import useBackButtonClose from "@/hooks/useBackButtonClose";

export default function RatingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratedItems, setRatedItems] = useState([]);
  const [unratedCreations, setUnratedCreations] = useState([]);
  const [lists, setLists] = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [watchlistFilter, setWatchlistFilter] = useState("all"); // "all" | "album" | "ep" | "mixtape" | "single"
  const [subTab, setSubTab] = useState("albums");
  const [projectFilter, setProjectFilter] = useState("all"); // "all" | "album" | "ep" | "mixtape"
  const [sortMode, setSortMode] = useState("best");
  const [ratingItem, setRatingItem] = useState(null);
  const [albumItem, setAlbumItem] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useBackButtonClose(!!albumItem, () => setAlbumItem(null));
  useBackButtonClose(!!ratingItem, () => setRatingItem(null));
  useBackButtonClose(createOpen, () => setCreateOpen(false));

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
        releaseType: r.catalog_items.release_type,
        title: r.catalog_items.title,
        artist: r.catalog_items.artist,
        artistId: r.catalog_items.artist_id,
        coverUrl: r.catalog_items.cover_url,
        deezerId: r.catalog_items.deezer_id,
        previewUrl: r.catalog_items.preview_url,
        rating: r.rating,
        updatedAt: r.updated_at,
      }));
    setRatedItems(items);
    return items;
  };

  const loadUnratedCreations = async (uid, ratedList) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("catalog_items")
      .select("*")
      .eq("created_by", uid)
      .order("created_at", { ascending: false });

    const ratedIds = new Set((ratedList || []).map((r) => r.id));
    const unrated = (data || [])
      .filter((it) => !ratedIds.has(it.id))
      .map((it) => ({
        id: it.id,
        type: it.type,
        releaseType: it.release_type,
        title: it.title,
        artist: it.artist,
        artistId: it.artist_id,
        coverUrl: it.cover_url,
        deezerId: it.deezer_id,
        previewUrl: it.preview_url,
      }));
    setUnratedCreations(unrated);
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

  const loadWatchlist = async (uid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("watchlist")
      .select("created_at, catalog_items(*)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    const items = (data || [])
      .filter((w) => w.catalog_items)
      .map((w) => ({
        id: w.catalog_items.id,
        type: w.catalog_items.type,
        releaseType: w.catalog_items.release_type,
        title: w.catalog_items.title,
        artist: w.catalog_items.artist,
        coverUrl: w.catalog_items.cover_url,
        deezerId: w.catalog_items.deezer_id,
        previewUrl: w.catalog_items.preview_url,
      }));
    setWatchlistItems(items);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      const ratedList = await loadRatings(session.user.id);
      await loadUnratedCreations(session.user.id, ratedList);
      await loadLists(session.user.id);
      await loadWatchlist(session.user.id);
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
    if (userId) {
      const ratedList = await loadRatings(userId);
      await loadUnratedCreations(userId, ratedList);
    }
  };

  const handleAlbumSaved = async () => {
    if (userId) {
      const ratedList = await loadRatings(userId);
      await loadUnratedCreations(userId, ratedList);
    }
  };

  const [createListError, setCreateListError] = useState("");

  const createList = async () => {
    if (!newListName.trim() || !userId) return;
    setCreateListError("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("custom_lists")
      .insert({ user_id: userId, name: newListName.trim() })
      .select()
      .single();
    if (error) {
      setCreateListError(error.message);
      return;
    }
    if (data) {
      setLists((prev) => [{ id: data.id, name: data.name, items: [] }, ...prev]);
    }
    setNewListName("");
    setCreatingList(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const filtered = ratedItems.filter((it) => {
    if (subTab === "albums") {
      if (it.type !== "album") return false;
      if (projectFilter === "all") return true;
      const t = it.releaseType || "album";
      return t === projectFilter;
    }
    return it.type === "single";
  });

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
      <div className="mt-page-enter">
      <p className="text-lg font-extrabold mb-4">Mes notes</p>

      <button
        onClick={() => setCreateOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-dashed border-zinc-600 rounded-xl py-3 mb-5 text-sm font-bold text-mtgold"
      >
        + Ajouter un album / single
      </button>

      {unratedCreations.length > 0 && (
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">
            Tes ajouts (pas encore notés)
          </p>
          <div className="flex flex-col gap-3">
            {unratedCreations.map((item) => (
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
                <span className="bg-mtgold text-black text-[9px] font-bold rounded px-1.5 py-0.5 flex-shrink-0">
                  {item.type === "album" ? (item.releaseType === "ep" ? "EP" : item.releaseType === "mixtape" ? "MIXTAPE" : "ALBUM") : "SINGLE"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          {
            key: "albums",
            label: `Projets (${ratedItems.filter((it) => it.type === "album").length})`,
          },
          {
            key: "singles",
            label: `Singles (${ratedItems.filter((it) => it.type === "single").length})`,
          },
          { key: "watchlist", label: `À écouter (${watchlistItems.length})` },
          { key: "lists", label: `Listes (${lists.length})` },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setSubTab(s.key)}
            className={`rounded-xl py-3 text-sm font-bold transition-colors ${
              subTab === s.key
                ? "bg-mtgold text-black shadow-[0_2px_10px_rgba(242,194,48,0.35)]"
                : "bg-white/[0.06] text-zinc-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {subTab === "albums" && (
        <div className="flex gap-2 mb-4">
          {[
            { key: "all", label: "Tout" },
            { key: "album", label: "Album" },
            { key: "ep", label: "EP" },
            { key: "mixtape", label: "Mixtape" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setProjectFilter(f.key)}
              className={`flex-1 rounded-full py-1.5 text-[11px] font-bold ${
                projectFilter === f.key ? "bg-white/20 text-white" : "bg-white/[0.04] text-zinc-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {subTab !== "lists" && subTab !== "watchlist" && (
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

      {subTab !== "lists" && subTab !== "watchlist" && sorted.length === 0 && (
        <p className="text-zinc-400 text-sm">
          Tu n&apos;as encore rien noté dans cette catégorie. Va noter un {subTab === "albums" ? "projet" : "titre"} depuis l&apos;accueil.
        </p>
      )}

      {subTab !== "lists" && subTab !== "watchlist" && (
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
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {subTab === "albums" && (
                    <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                      {item.releaseType === "ep" ? "EP" : item.releaseType === "mixtape" ? "MIXTAPE" : "ALBUM"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
              </div>
              <span className="text-mtgold text-sm font-bold flex-shrink-0">
                {item.rating}/{maxScale}
              </span>
            </div>
          ))}
        </div>
      )}

      {subTab === "watchlist" && (
        <div className="flex flex-col gap-3">
          {watchlistItems.length > 0 && (
            <div className="flex gap-2 mb-2">
              {[
                { key: "all", label: "Tout" },
                { key: "project", label: "Projet" },
                { key: "single", label: "Single" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setWatchlistFilter(f.key)}
                  className={`flex-1 rounded-full py-2 text-xs font-bold ${
                    watchlistFilter === f.key ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {watchlistItems.length === 0 && (
            <p className="text-zinc-400 text-sm">
              Rien dans ta liste "À écouter plus tard" pour l&apos;instant. Ajoute des titres depuis leur fiche.
            </p>
          )}
          {watchlistItems
            .filter((item) => {
              if (watchlistFilter === "all") return true;
              if (watchlistFilter === "single") return item.type === "single";
              return item.type === "album";
            })
            .map((item) => (
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
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <span className="bg-mtgold text-black text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                    {item.type === "album"
                      ? item.releaseType === "ep"
                        ? "EP"
                        : item.releaseType === "mixtape"
                        ? "MIXTAPE"
                        : "ALBUM"
                      : "SINGLE"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
              </div>
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

          {createListError && <p className="text-red-400 text-xs mb-3">{createListError}</p>}

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
      </div>

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={ratingItem ? ratingItem.rating : undefined}
        onClose={() => {
          setRatingItem(null);
          if (userId) loadWatchlist(userId);
        }}
        onSaved={handleRatingSaved}
      />

      <AlbumDetail
        item={albumItem}
        userId={userId}
        onClose={() => {
          setAlbumItem(null);
          if (userId) loadWatchlist(userId);
        }}
        onSaved={handleAlbumSaved}
      />

      {createOpen && (
        <CreateItemModal
          userId={userId}
          onClose={() => setCreateOpen(false)}
          onCreated={async (newItem) => {
            setCreateOpen(false);
            if (userId) await loadUnratedCreations(userId, ratedItems);
            if (newItem.type === "album") {
              setAlbumItem(newItem);
            } else {
              setRatingItem(newItem);
            }
          }}
        />
      )}

      <BottomNav />
    </div>
  );
}
