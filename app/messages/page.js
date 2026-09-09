"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";

export default function MessagesInboxPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data } = await supabase
        .from("messages")
        .select("sender_id, recipient_id, text, created_at, catalog_items(title)")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order("created_at", { ascending: false });

      const byFriend = new Map();
      (data || []).forEach((m) => {
        const friendId = m.sender_id === uid ? m.recipient_id : m.sender_id;
        if (!byFriend.has(friendId)) {
          byFriend.set(friendId, {
            friendId,
            lastText: m.catalog_items ? `🎵 ${m.catalog_items.title}` : m.text,
            lastAt: m.created_at,
            mine: m.sender_id === uid,
          });
        }
      });

      const friendIds = [...byFriend.keys()];
      if (friendIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, pseudo")
          .in("id", friendIds);
        (profilesData || []).forEach((p) => {
          const conv = byFriend.get(p.id);
          if (conv) conv.pseudo = p.pseudo;
        });
      }

      setConversations([...byFriend.values()].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)));
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto mt-page-enter">
      <p className="text-lg font-extrabold mb-5">Messages</p>

      {conversations.length === 0 && (
        <p className="text-zinc-400 text-sm">
          Aucune conversation pour l&apos;instant. Va sur le profil d&apos;un ami pour lui ecrire.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {conversations.map((c) => (
          <div
            key={c.friendId}
            onClick={() => router.push(`/messages/${c.friendId}`)}
            className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-mtgold text-black font-bold text-sm flex items-center justify-center flex-shrink-0">
              {c.pseudo ? c.pseudo.slice(0, 1).toUpperCase() : "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{c.pseudo || "Utilisateur"}</p>
              <p className="text-xs text-zinc-400 truncate">
                {c.mine ? "Toi: " : ""}
                {c.lastText}
              </p>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
