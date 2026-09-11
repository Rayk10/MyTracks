"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function CommunityComments({ itemId, userId, maxScale }) {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!itemId || !userId) return;
    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      setLoading(true);

      const { data: ratings } = await supabase
        .from("album_ratings")
        .select("user_id, rating, comment, updated_at")
        .eq("item_id", itemId)
        .neq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!ratings || ratings.length === 0) {
        if (!cancelled) {
          setEntries([]);
          setLoading(false);
        }
        return;
      }

      const userIds = ratings.map((r) => r.user_id);

      const [{ data: profilesData }, { data: friendsData }] = await Promise.all([
        supabase.from("profiles").select("id, pseudo, avatar_url").in("id", userIds),
        supabase.from("friendships").select("friend_id").eq("user_id", userId),
      ]);

      const profileMap = {};
      (profilesData || []).forEach((p) => (profileMap[p.id] = p));
      const friendIds = new Set((friendsData || []).map((f) => f.friend_id));

      const merged = ratings.map((r) => ({
        userId: r.user_id,
        rating: r.rating,
        comment: r.comment,
        updatedAt: r.updated_at,
        pseudo: profileMap[r.user_id] ? profileMap[r.user_id].pseudo : "Utilisateur",
        avatarUrl: profileMap[r.user_id] ? profileMap[r.user_id].avatar_url : null,
        isFriend: friendIds.has(r.user_id),
      }));

      merged.sort((a, b) => {
        if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

      if (!cancelled) {
        setEntries(merged);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [itemId, userId]);

  if (loading || entries.length === 0) return null;

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between bg-white/[0.04] rounded-xl px-4 py-3"
      >
        <span className="text-sm font-bold">Avis de la communauté ({entries.length})</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 mt-3">
          {entries.map((e) => (
            <div key={e.userId} className="flex gap-3">
              {e.avatarUrl ? (
                <img src={e.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-mtgold text-black font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {e.pseudo.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold">{e.pseudo}</span>
                  {e.isFriend && (
                    <span className="bg-mtgold text-black text-[9px] font-bold rounded px-1.5 py-0.5">
                      AMI
                    </span>
                  )}
                  <span className="text-mtgold text-xs font-bold">
                    {e.rating}/{maxScale}
                  </span>
                </div>
                {e.comment ? (
                  <p className="text-sm text-zinc-300 mt-1">{e.comment}</p>
                ) : (
                  <p className="text-xs text-zinc-500 mt-1">A noté sans laisser d&apos;avis.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
