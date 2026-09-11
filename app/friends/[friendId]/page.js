"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import RatingSheet from "@/components/RatingSheet";
import AlbumDetail from "@/components/AlbumDetail";
import BottomNav from "@/components/BottomNav";

export default function FriendProfilePage() {
  const router = useRouter();
  const params = useParams();
  const friendId = params.friendId;

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pseudo, setPseudo] = useState("");
  const [stats, setStats] = useState({ albums: 0, tracks: 0 });
  const [featured, setFeatured] = useState([]);
  const [recent, setRecent] = useState([]);
  const [ratingItem, setRatingItem] = useState(null);
  const [albumItem, setAlbumItem] = useState(null);

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
        .eq("id", friendId)
        .single();
      setPseudo(profileData ? profileData.pseudo : "Utilisateur");

      const { data: ratingsData } = await supabase
        .from("album_ratings")
        .select("rating, updated_at, catalog_items(*)")
        .eq("user_id", friendId)
        .order("updated_at", { ascending: false });

      const withItems = (ratingsData || []).filter((r) => r.catalog_items);
      setStats({
        albums: withItems.filter((r) => r.catalog_items.type === "album").length,
        tracks: withItems.filter((r) => r.catalog_items.type === "single").length,
      });
      setRecent(withItems.slice(0, 8));

      const { data: featuredData } = await supabase
        .from("featured_albums")
        .select("slot, catalog_items(*)")
        .eq("user_id", friendId)
        .order("slot", { ascending: true });
      setFeatured((featuredData || []).map((f) => f.catalog_items).filter(Boolean));

      setLoading(false);
    });
  }, [friendId, router]);

  const openItem = (catalogItem, rating) => {
    const item = {
      id: catalogItem.id,
      type: catalogItem.type,
      title: catalogItem.title,
      artist: catalogItem.artist,
      artistId: catalogItem.artist_id,
      coverUrl: catalogItem.cover_url,
      deezerId: catalogItem.deezer_id,
      previewUrl: catalogItem.preview_url,
    };
    if (catalogItem.type === "album") {
      setAlbumItem(item);
    } else {
      setRatingItem(item);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <div className="mt-page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-xl">
          ←
        </button>
        <p className="font-extrabold text-lg">{pseudo}</p>
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 rounded-full bg-mtgold text-black font-extrabold text-3xl flex items-center justify-center mb-3">
          {pseudo.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-lg font-extrabold text-mtgold">{stats.albums}</p>
            <p className="text-xs text-zinc-400">Projets notés</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold text-mtgold">{stats.tracks}</p>
            <p className="text-xs text-zinc-400">Titres notés</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => router.push(`/messages/${friendId}`)}
        className="w-full bg-mtgold text-black rounded-full py-3 font-bold mb-8 active:scale-95 transition-transform"
      >
        Envoyer un message
      </button>

      {featured.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Projets préférés</p>
          <div className="grid grid-cols-4 gap-2 mb-8">
            {featured.map((item) => (
              <div key={item.id} onClick={() => openItem(item)} className="cursor-pointer">
                {item.cover_url ? (
                  <img src={item.cover_url} alt="" className="w-full aspect-square rounded-lg object-cover" />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-zinc-800" />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Écoutes récentes</p>
          <div className="flex flex-col gap-3">
            {recent.map((r) => (
              <div
                key={r.catalog_items.id}
                onClick={() => openItem(r.catalog_items, r.rating)}
                className="flex items-center gap-3 cursor-pointer"
              >
                {r.catalog_items.cover_url ? (
                  <img src={r.catalog_items.cover_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-zinc-800 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{r.catalog_items.title}</p>
                    {r.catalog_items.type === "album" && (
                      <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                        {r.catalog_items.release_type === "ep"
                          ? "EP"
                          : r.catalog_items.release_type === "mixtape"
                          ? "MIXTAPE"
                          : "ALBUM"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{r.catalog_items.artist}</p>
                </div>
                <span className="text-mtgold text-xs font-bold flex-shrink-0">
                  {r.rating}/{r.catalog_items.type === "album" ? 10 : 5}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      </div>

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={undefined}
        onClose={() => setRatingItem(null)}
        onSaved={() => setRatingItem(null)}
      />

      <AlbumDetail item={albumItem} userId={userId} onClose={() => setAlbumItem(null)} onSaved={() => {}} />

      <BottomNav />
    </div>
  );
}
