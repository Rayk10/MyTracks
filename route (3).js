import { createClient } from "@/lib/supabaseClient";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("id");
  const artistName = searchParams.get("name") || "Artiste inconnu";

  if (!artistId) {
    return Response.json({ error: "id manquant" }, { status: 400 });
  }

  try {
    const albumsRes = await fetch(`https://api.deezer.com/artist/${artistId}/albums?limit=100`);
    const albumsData = await albumsRes.json();

    const seenReleaseIds = new Set();
    const rawReleases = (albumsData.data || []).filter((a) => {
      if (seenReleaseIds.has(a.id)) return false;
      seenReleaseIds.add(a.id);
      return true;
    });

    // Albums et EP (multi-titres, notes sur 10), tries du plus ancien au plus recent
    const albums = rawReleases
      .filter((a) => a.record_type === "album" || a.record_type === "ep")
      .filter((a) => a.title && a.title.trim())
      .map((a) => ({
        id: `deezer-album-${a.id}`,
        deezerId: a.id,
        type: "album",
        releaseType: a.record_type === "ep" ? "ep" : "album",
        title: a.title,
        artist: artistName,
        coverUrl: a.cover_medium,
        trackCount: a.nb_tracks,
        releaseDate: a.release_date,
      }))
      .sort((x, y) => new Date(x.releaseDate || 0) - new Date(y.releaseDate || 0));

    // Vraies sorties single de l'artiste, triees du plus recent au plus ancien
    const singles = rawReleases
      .filter((a) => a.record_type === "single")
      .filter((a) => a.title && a.title.trim())
      .map((a) => ({
        id: `deezer-single-${a.id}`,
        deezerId: a.id,
        type: "single",
        title: a.title,
        artist: artistName,
        coverUrl: a.cover_medium,
        releaseDate: a.release_date,
        previewUrl: null,
      }))
      .sort((x, y) => new Date(y.releaseDate || 0) - new Date(x.releaseDate || 0));

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

    return Response.json({ albums, singles });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la récupération des données artiste" }, { status: 500 });
  }
}
