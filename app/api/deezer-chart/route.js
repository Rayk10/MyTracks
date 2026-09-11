import { createClient } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const res = await fetch("https://api.deezer.com/chart/0/albums?limit=10");
    const data = await res.json();

    const seen = new Set();
    const albums = (data.data || [])
      .filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .filter((a) => a.title && a.title.trim() && a.artist && a.artist.name)
      .map((a) => ({
        kind: "album",
        id: `deezer-album-${a.id}`,
        deezerId: a.id,
        type: "album",
        releaseType: a.record_type === "ep" ? "ep" : "album",
        title: a.title,
        artist: a.artist.name,
        artistId: a.artist.id,
        coverUrl: a.cover_medium,
      }));

    if (albums.length > 0) {
      try {
        const supabase = createClient();
        const { data: overrides } = await supabase
          .from("catalog_items")
          .select("id, release_type")
          .in("id", albums.map((a) => a.id));
        const overrideMap = {};
        (overrides || []).forEach((o) => {
          if (o.release_type) overrideMap[o.id] = o.release_type;
        });
        albums.forEach((a) => {
          if (overrideMap[a.id]) a.releaseType = overrideMap[a.id];
        });
      } catch (err) {
        // si ca echoue, on garde simplement le type detecte par Deezer
      }
    }

    return Response.json({ albums });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recuperation des tendances" }, { status: 500 });
  }
}
