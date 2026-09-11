"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function WatchlistButton({ userId, itemPayload }) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (loading) return;
    setLoading(true);
    setError("");
    const supabase = createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setLoading(false);
      setError("Ta session a expire. Reconnecte-toi puis reessaie.");
      return;
    }
    const realUserId = session.user.id;

    try {
      if (inWatchlist) {
        const { error: deleteError } = await supabase
          .from("watchlist")
          .delete()
          .eq("user_id", realUserId)
          .eq("item_id", itemPayload.id);
        if (deleteError) throw deleteError;
        setInWatchlist(false);
      } else {
        const { error: catalogError } = await supabase.from("catalog_items").upsert(itemPayload);
        if (catalogError) throw catalogError;

        const { error: watchlistError } = await supabase
          .from("watchlist")
          .upsert({ user_id: realUserId, item_id: itemPayload.id });
        if (watchlistError) throw watchlistError;

        setInWatchlist(true);
      }
    } catch (err) {
      setError(err.message || "Erreur lors de la mise a jour de la watchlist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={toggle}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold active:scale-95 transition-transform ${
          inWatchlist ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-200"
        }`}
      >
        {loading ? "..." : inWatchlist ? "✓ Dans À écouter plus tard" : "+ À écouter plus tard"}
      </button>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
