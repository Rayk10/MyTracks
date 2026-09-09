"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ albums: 0, tracks: 0 });

  const [featured, setFeatured] = useState([null, null, null, null]);
  const [myAlbums, setMyAlbums] = useState([]);
  const [pickerSlot, setPickerSlot] = useState(null);

  const [friends, setFriends] = useState([]);
  const [friendSearchOpen, setFriendSearchOpen] = useState(false);
  const [friendQuery, setFriendQuery] = useState("");
  const [friendResults, setFriendResults] = useState([]);
  const [friendSearching, setFriendSearching] = useState(false);

  const loadFeatured = async (supabase, uid) => {
    const { data } = await supabase
      .from("featured_albums")
      .select("slot, catalog_items(*)")
      .eq("user_id", uid);

    const arr = [null, null, null, null];
    (data || []).forEach((row) => {
      if (row.catalog_items) arr[row.slot] = row.catalog_items;
    });
    setFeatured(arr);
  };

  const loadFriends = async (supabase, uid) => {
    const { data } = await supabase
      .from("friendships")
      .select("friend_id, profiles!friendships_friend_id_fkey(pseudo)")
      .eq("user_id", uid);
    setFriends(
      (data || [])
        .filter((f) => f.profiles)
        .map((f) => ({ id: f.friend_id, pseudo: f.profiles.pseudo }))
    );
  };

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
        .select("catalog_items(*)")
        .eq("user_id", session.user.id);

      const albums = (ratingsData || [])
        .map((r) => r.catalog_items)
        .filter((it) => it && it.type === "album");
      setMyAlbums(albums);

      setStats({
        albums: albums.length,
        tracks: (ratingsData || []).filter((r) => r.catalog_items && r.catalog_items.type === "single").length,
      });

      await loadFeatured(supabase, session.user.id);
      await loadFriends(supabase, session.user.id);
      setLoading(false);
    });
  }, [router]);

  const chooseFeatured = async (item) => {
    if (pickerSlot === null || !userId) return;
    const supabase = createClient();
    await supabase.from("featured_albums").upsert({
      user_id: userId,
      slot: pickerSlot,
      item_id: item.id,
    });
    const updated = [...featured];
    updated[pickerSlot] = item;
    setFeatured(updated);
    setPickerSlot(null);
  };

  const removeFeatured = async (slot) => {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("featured_albums").delete().eq("user_id", userId).eq("slot", slot);
    const updated = [...featured];
    updated[slot] = null;
    setFeatured(updated);
  };

  const searchFriends = async (e) => {
    e.preventDefault();
    if (!friendQuery.trim() || !userId) return;
    setFriendSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, pseudo")
      .ilike("pseudo", `%${friendQuery.trim()}%`)
      .neq("id", userId)
      .limit(20);
    setFriendResults(data || []);
    setFriendSearching(false);
  };

  const addFriend = async (friend) => {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("friendships").upsert(
      { user_id: userId, friend_id: friend.id },
      { onConflict: "user_id,friend_id" }
    );
    setFriends((prev) => (prev.some((f) => f.id === friend.id) ? prev : [...prev, friend]));
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
    <div className="min-h-screen px-4 pt-8 pb-28 max-w-md mx-auto">
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-mtgold text-black font-extrabold text-4xl flex items-center justify-center mb-3">
          {profile && profile.pseudo ? profile.pseudo.slice(0, 1).toUpperCase() : ""}
        </div>
        <p className="text-xl font-extrabold">{profile ? profile.pseudo : ""}</p>
      </div>

      <div className="flex justify-center gap-8 mb-8">
        <div className="text-center">
          <p className="text-lg font-extrabold text-mtgold">{stats.albums}</p>
          <p className="text-xs text-zinc-400">Albums notes</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-mtgold">{stats.tracks}</p>
          <p className="text-xs text-zinc-400">Titres notes</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Amis</p>
        <button
          onClick={() => {
            setFriendSearchOpen(true);
            setFriendQuery("");
            setFriendResults([]);
          }}
          className="w-7 h-7 rounded-full bg-mtgold text-black flex items-center justify-center text-sm font-bold"
        >
          +
        </button>
      </div>

      {friends.length === 0 ? (
        <p className="text-zinc-400 text-sm mb-8">
          Tu n&apos;as encore ajoute aucun ami. Tape sur le + pour en chercher.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mb-8">
          {friends.map((f) => (
            <div
              key={f.id}
              onClick={() => router.push(`/friends/${f.id}`)}
              className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-2 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-mtgold text-black font-bold text-xs flex items-center justify-center flex-shrink-0">
                {f.pseudo.slice(0, 1).toUpperCase()}
              </div>
              <p className="text-sm font-medium flex-1">{f.pseudo}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Mes 4 albums preferes</p>
      <div className="grid grid-cols-4 gap-2 mb-10">
        {[0, 1, 2, 3].map((slot) => {
          const item = featured[slot];
          return (
            <div key={slot} className="relative">
              {item ? (
                <div onClick={() => setPickerSlot(slot)} className="cursor-pointer">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt="" className="w-full aspect-square rounded-lg object-cover" />
                  ) : (
                    <div className="w-full aspect-square rounded-lg bg-zinc-800" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFeatured(slot);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black border border-zinc-600 text-[10px] flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setPickerSlot(slot)}
                  className="w-full aspect-square rounded-lg border border-dashed border-zinc-600 flex items-center justify-center cursor-pointer"
                >
                  <span className="text-zinc-500 text-lg">+</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleLogout}
        className="w-full border border-zinc-700 text-white rounded-full py-3 font-semibold text-sm"
      >
        Se deconnecter
      </button>

      {pickerSlot !== null && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setPickerSlot(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <p className="font-bold text-sm mb-4">Choisir un album</p>
            {myAlbums.length === 0 && (
              <p className="text-zinc-400 text-sm">
                Tu dois d&apos;abord noter des albums depuis l&apos;accueil pour pouvoir les mettre en avant ici.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {myAlbums.map((item) => (
                <div
                  key={item.id}
                  onClick={() => chooseFeatured(item)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {item.cover_url ? (
                    <img src={item.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{item.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {friendSearchOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-30"
          onClick={() => setFriendSearchOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Chercher un ami</p>
              <button
                onClick={() => setFriendSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={searchFriends} className="flex gap-2 mb-4">
              <input
                autoFocus
                value={friendQuery}
                onChange={(e) => setFriendQuery(e.target.value)}
                placeholder="Pseudo..."
                className="flex-1 bg-white/[0.06] rounded-full px-4 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={friendSearching}
                className="bg-mtgold text-black rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {friendSearching ? "..." : "Go"}
              </button>
            </form>

            {friendResults.length === 0 && (
              <p className="text-zinc-400 text-sm">Cherche un pseudo pour trouver quelqu&apos;un.</p>
            )}

            <div className="flex flex-col gap-3">
              {friendResults.map((f) => {
                const already = friends.some((fr) => fr.id === f.id);
                return (
                  <div key={f.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-mtgold text-black font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {f.pseudo.slice(0, 1).toUpperCase()}
                    </div>
                    <p className="text-sm font-medium flex-1">{f.pseudo}</p>
                    <button
                      onClick={() => addFriend(f)}
                      disabled={already}
                      className={`text-xs font-bold rounded-full px-3 py-1.5 flex-shrink-0 ${
                        already ? "bg-mtgold text-black" : "bg-white/10 text-white"
                      }`}
                    >
                      {already ? "Ajoute" : "Ajouter"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
