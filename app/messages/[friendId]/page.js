"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import RatingSheet from "@/components/RatingSheet";
import AlbumDetail from "@/components/AlbumDetail";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const friendId = params.friendId;

  const [userId, setUserId] = useState(null);
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [shareResults, setShareResults] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);

  const [ratingItem, setRatingItem] = useState(null);
  const [albumItem, setAlbumItem] = useState(null);

  const bottomRef = useRef(null);

  const loadMessages = async (uid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, text, created_at, catalog_items(*)")
      .or(
        `and(sender_id.eq.${uid},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${uid})`
      )
      .order("created_at", { ascending: true });
    setMessages(data || []);
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
        .eq("id", friendId)
        .single();
      setPseudo(profileData ? profileData.pseudo : "Utilisateur");

      await loadMessages(session.user.id);
      setLoading(false);
    });
  }, [friendId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !userId) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: friendId,
      text: text.trim(),
    });
    setText("");
    await loadMessages(userId);
    setSending(false);
  };

  const runShareSearch = async (e) => {
    e.preventDefault();
    if (!shareQuery.trim()) return;
    setShareLoading(true);
    try {
      const res = await fetch("/api/deezer-search?q=" + encodeURIComponent(shareQuery));
      const data = await res.json();
      setShareResults((data.results || []).filter((r) => r.kind !== "artist"));
    } catch (err) {
      setShareResults([]);
    } finally {
      setShareLoading(false);
    }
  };

  const shareItem = async (result) => {
    if (!userId) return;
    const supabase = createClient();
    const catalogId = result.id;

    await supabase.from("catalog_items").upsert({
      id: catalogId,
      type: result.kind === "album" ? "album" : "single",
      title: result.title,
      artist: result.artist,
      cover_url: result.coverUrl,
      deezer_id: result.deezerId ? String(result.deezerId) : null,
      preview_url: result.previewUrl || null,
    });

    await supabase.from("messages").insert({
      sender_id: userId,
      recipient_id: friendId,
      shared_item_id: catalogId,
    });

    setShareOpen(false);
    await loadMessages(userId);
  };

  const openShared = (catalogItem) => {
    const item = {
      id: catalogItem.id,
      type: catalogItem.type,
      title: catalogItem.title,
      artist: catalogItem.artist,
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
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto mt-page-enter">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => router.push("/messages")} className="text-xl">
          ←
        </button>
        <div className="w-8 h-8 rounded-full bg-mtgold text-black font-bold text-xs flex items-center justify-center">
          {pseudo.slice(0, 1).toUpperCase()}
        </div>
        <p className="font-bold text-base">{pseudo}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-3 pb-4">
        {messages.length === 0 && (
          <p className="text-zinc-400 text-sm text-center mt-10">
            Aucun message pour l&apos;instant. Dis bonjour !
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              {m.catalog_items ? (
                <div
                  onClick={() => openShared(m.catalog_items)}
                  className={`flex items-center gap-2 rounded-xl p-2 max-w-[75%] cursor-pointer ${
                    mine ? "bg-mtgold text-black" : "bg-zinc-800 text-white"
                  }`}
                >
                  {m.catalog_items.cover_url ? (
                    <img src={m.catalog_items.cover_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-zinc-700 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{m.catalog_items.title}</p>
                    <p className="text-[11px] opacity-70 truncate">{m.catalog_items.artist}</p>
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-xl px-3 py-2 max-w-[75%] text-sm ${
                    mine ? "bg-mtgold text-black" : "bg-zinc-800 text-white"
                  }`}
                >
                  {m.text}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-6 pt-2 flex items-center gap-2">
        <button
          onClick={() => {
            setShareOpen(true);
            setShareQuery("");
            setShareResults([]);
          }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-lg"
        >
          🎵
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Écris un message..."
          className="flex-1 bg-white/[0.06] rounded-full px-4 py-2.5 text-sm outline-none"
        />
        <button
          onClick={sendMessage}
          disabled={sending}
          className="bg-mtgold text-black rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 flex-shrink-0"
        >
          {sending ? "..." : "Envoyer"}
        </button>
      </div>

      {shareOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end z-30"
          onClick={() => setShareOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-md mx-auto rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Partager un titre</p>
              <button
                onClick={() => setShareOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={runShareSearch} className="flex gap-2 mb-4">
              <input
                autoFocus
                value={shareQuery}
                onChange={(e) => setShareQuery(e.target.value)}
                placeholder="Chercher un album, un titre..."
                className="flex-1 bg-white/[0.06] rounded-full px-4 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={shareLoading}
                className="bg-mtgold text-black rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {shareLoading ? "..." : "Go"}
              </button>
            </form>

            <div className="flex flex-col gap-3">
              {shareResults.map((r) => (
                <div
                  key={r.id}
                  onClick={() => shareItem(r)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  {r.coverUrl ? (
                    <img src={r.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-zinc-800 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{r.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <RatingSheet
        item={ratingItem}
        userId={userId}
        currentRating={undefined}
        onClose={() => setRatingItem(null)}
        onSaved={() => setRatingItem(null)}
      />

      <AlbumDetail item={albumItem} userId={userId} onClose={() => setAlbumItem(null)} onSaved={() => {}} />
    </div>
  );
}
