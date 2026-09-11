"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function WatchlistButton({ userId, itemPayload }) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !itemPayload || !itemPayload.id) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("watchlist")
      .select("item_id")
      .eq("user_id", userId)
      .eq("item_id", itemPayload.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setInWatchlist(!!data);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, itemPayload]);

  const toggle = async () => {
    if (!userId || loading) return;
    setLoading(true);
    const supabase = createClient();

    try {
      if (inWatchlist) {
        await supabase.from("watchlist").delete().eq("user_id", userId).eq("item_id", itemPayload.id);
        setInWatchlist(false);
      } else {
        await supabase.from("catalog_items").upsert(itemPayload);
        await supabase.from("watchlist").upsert({ user_id: userId, item_id: itemPayload.id });
        setInWatchlist(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold mb-4 active:scale-95 transition-transform ${
        inWatchlist ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-200"
      }`}
    >
      {inWatchlist ? "✓ Dans À écouter plus tard" : "+ À écouter plus tard"}
    </button>
  );
}
