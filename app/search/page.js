"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BottomNav from "@/components/BottomNav";

const MONTHS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
];

const TILES = [
  { key: "selection", color: "#8b5cf6" },
  { key: "nouveautes", label: "Dernieres sorties", color: "#0d9488" },
  { key: "hiphop", label: "Hip-Hop", color: "#52525b", genre: "Hip Hop" },
  { key: "pop", label: "Pop", color: "#16a34a", genre: "Pop" },
  { key: "rock", label: "Rock", color: "#b91c1c", genre: "Rock" },
  { key: "electro", label: "Electro", color: "#2563eb", genre: "Electro" },
  { key: "community-tracks", label: "Les titres preferes de la communaute", color: "#78716c" },
  { key: "community-albums", label: "Les albums preferes de la communaute", color: "#1e3a8a" },
];

export default function SearchHubPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [peeks, setPeeks] = useState({});

  const now = new Date();
  const selectionLabel = `Ta selection de ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  useEffect(() => {
    const supabase = createClient();

    const loadPeeks = async () => {
      try {
        const chartRes = await fetch("/api/deezer-chart").then((r) => r.json());
        const chartCover = chartRes.albums && chartRes.albums[0] ? chartRes.albums[0].coverUrl : null;
        setPeeks((prev) => ({ ...prev, selection: chartCover, nouveautes: chartCover }));
      } catch (err) {}

      for (const tile of TILES.filter((t) => t.genre)) {
        try {
          const res = await fetch("/api/deezer-genre?name=" + encodeURIComponent(tile.genre)).then((r) =>
            r.json()
          );
          const cover = res.albums && res.albums[0] ? res.albums[0].coverUrl : null;
          setPeeks((prev) => ({ ...prev, [tile.key]: cover }));
        } catch (err) {}
      }

      try {
        const { data: singleData } = await supabase
          .from("album_ratings")
          .select("rating, catalog_items!inner(cover_url, type)")
          .eq("catalog_items.type", "single")
          .order("rating", { ascending: false })
          .limit(1);
        if (singleData && singleData[0]) {
          setPeeks((prev) => ({ ...prev, "community-tracks": singleData[0].catalog_items.cover_url }));
        }
      } catch (err) {}

      try {
        const { data: albumData } = await supabase
          .from("album_ratings")
          .select("rating, catalog_items!inner(cover_url, type)")
          .eq("catalog_items.type", "album")
          .order("rating", { ascending: false })
          .limit(1);
        if (albumData && albumData[0]) {
          setPeeks((prev) => ({ ...prev, "community-albums": albumData[0].catalog_items.cover_url }));
        }
      } catch (err) {}
    };

    loadPeeks();
  }, []);

  const goToSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/home?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto mt-page-enter">
      <p className="text-lg font-extrabold mb-4">Recherche</p>

      <form onSubmit={goToSearch} className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Album, artiste..."
          className="w-full bg-white/[0.06] rounded-full px-4 py-3 text-sm outline-none placeholder:text-zinc-500"
        />
      </form>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <div
            key={tile.key}
            onClick={() => router.push(`/search/${tile.key}`)}
            className="relative rounded-2xl p-4 h-32 cursor-pointer overflow-hidden flex items-start"
            style={{ background: tile.color }}
          >
            {peeks[tile.key] ? (
              <img
                src={peeks[tile.key]}
                alt=""
                className="absolute -bottom-3 -right-3 w-16 h-16 rounded-xl object-cover shadow-lg"
                style={{ transform: "rotate(12deg)" }}
              />
            ) : (
              <div
                className="absolute -bottom-4 -right-4 w-16 h-16 rounded-xl"
                style={{ background: "rgba(0,0,0,0.15)", transform: "rotate(15deg)" }}
              />
            )}
            <p className="text-sm font-extrabold text-white leading-tight relative z-10">
              {tile.key === "selection" ? selectionLabel : tile.label}
            </p>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
