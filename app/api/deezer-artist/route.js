import { createClient } from "@/lib/supabaseClient";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("id");
  const artistName = searchParams.get("name") || "Artiste inconnu";

  if (!artistId) {
    return Response.json({ error: "id manquant" }, { status: 400 });
  }

  try {
    // On recupere TOUTES les pages de sorties de l'artiste, Deezer decoupant ses resultats
    let allReleases = [];
    let nextUrl = `https://api.deezer.com/artist/${artistId}/albums?limit=100`;
    let safety = 0;

    while (nextUrl && safety < 20) {
      const pageRes = await fetch(nextUrl);
      const pageData = await pageRes.json();
      allReleases = allReleases.concat(pageData.data || []);
      nextUrl = pageData.next || null;
      safety += 1;
    }

    // Deezer ne remonte parfois pas tout via /artist/{id}/albums (cas particuliers : reeditions,
    // compilations reprises par le label...). On croise avec une recherche avancee par nom
    // d'artiste pour rattraper ce que la premiere methode pourrait louper.
    try {
      let searchNextUrl = `https://api.deezer.com/search/album?q=${encodeURIComponent(
        `artist:"${artistName}"`
      )}&limit=100`;
      let searchSafety = 0;
      const targetNameLower = artistName.trim().toLowerCase();
      while (searchNextUrl && searchSafety < 10) {
        const searchRes = await fetch(searchNextUrl);
        const searchData = await searchRes.json();
        const matching = (searchData.data || []).filter(
          (a) => a.artist && a.artist.name && a.artist.name.trim().toLowerCase() === targetNameLower
        );
        allReleases = allReleases.concat(matching);
        searchNextUrl = searchData.next || null;
        searchSafety += 1;
      }
    } catch (err) {
      // si cette seconde source echoue, on garde simplement ce que la premiere a donne
    }

    const seenReleaseIds = new Set();
    const rawReleases = allReleases.filter((a) => {
      if (seenReleaseIds.has(a.id)) return false;
      seenReleaseIds.add(a.id);
      return true;
    });

    // Deezer liste parfois plusieurs editions du meme projet (standard, deluxe, collector...)
    // avec des identifiants et des dates differentes. On ne garde que la meilleure version par titre.
    const dedupeByTitle = (list, pickBest) => {
      const byTitle = new Map();
      for (const item of list) {
        const key = item.title.trim().toLowerCase();
        const existing = byTitle.get(key);
        if (!existing || pickBest(item, existing) === item) {
          byTitle.set(key, item);
        }
      }
      return [...byTitle.values()];
    };

    // Albums et EP (multi-titres, notes sur 10), tries du plus ancien au plus recent
    const albums = dedupeByTitle(
      rawReleases
        .filter((a) => a.record_type !== "single")
        .filter((a) => a.title && a.title.trim())
        .map((a) => ({
          id: `deezer-album-${a.id}`,
          deezerId: a.id,
          type: "album",
          releaseType: a.record_type === "ep" ? "ep" : "album",
          title: a.title,
          artist: artistName,
          artistId: Number(artistId),
          coverUrl: a.cover_medium,
          trackCount: a.nb_tracks,
          releaseDate: a.release_date,
        })),
      // on privilegie l'edition avec le plus de titres (souvent la deluxe/complete)
      (a, b) => ((a.trackCount || 0) >= (b.trackCount || 0) ? a : b)
    ).sort((x, y) => new Date(x.releaseDate || 0) - new Date(y.releaseDate || 0));

    // Vraies sorties single de l'artiste, triees du plus recent au plus ancien
    const singles = dedupeByTitle(
      rawReleases
        .filter((a) => a.record_type === "single")
        .filter((a) => a.title && a.title.trim())
        .map((a) => ({
          id: `deezer-single-${a.id}`,
          deezerId: a.id,
          type: "single",
          title: a.title,
          artist: artistName,
          artistId: Number(artistId),
          coverUrl: a.cover_medium,
          releaseDate: a.release_date,
          previewUrl: null,
        })),
      // on privilegie la sortie la plus ancienne (version originale plutot qu'un remix/edition ulterieure)
      (a, b) => (new Date(a.releaseDate || 0) <= new Date(b.releaseDate || 0) ? a : b)
    ).sort((x, y) => new Date(y.releaseDate || 0) - new Date(x.releaseDate || 0));

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
