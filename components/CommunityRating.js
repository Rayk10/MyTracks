"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function CommunityRating({ itemId, maxScale }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("album_ratings")
      .select("rating")
      .eq("item_id", itemId)
      .then(({ data }) => {
        if (cancelled) return;
        if (!data || data.length === 0) {
          setStats(null);
          return;
        }
        const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
        setStats({ avg, count: data.length });
      });

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (!stats) return null;

  return (
    <p className="text-sm mb-4">
      <span className="text-mtgold font-extrabold text-base">{stats.avg.toFixed(1)}</span>
      <span className="text-zinc-400"> note communaute MyTracks · {stats.count} note{stats.count > 1 ? "s" : ""}</span>
    </p>
  );
}
