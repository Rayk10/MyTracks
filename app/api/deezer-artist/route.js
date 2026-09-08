export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("id");

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

    const albums = rawReleases
      .filter((a) => a.record_type === "album")
      .filter((a) => a.title && a.title.trim())
      .map((a) => ({
        id: `deezer-album-${a.id}`,
        deezerId: a.id,
        type: "album",
        title: a.title,
        artist: a.artist?.name || "Artiste inconnu",
        coverUrl: a.cover_medium,
        trackCount: a.nb_tracks,
        releaseDate: a.release_date,
      }))
      .sort((x, y) => new Date(x.releaseDate || 0) - new Date(y.releaseDate || 0));

    const singles = rawReleases
      .filter((a) => a.record_type === "single" || a.record_type === "ep")
      .filter((a) => a.title && a.title.trim())
      .map((a) => ({
        id: `deezer-single-${a.id}`,
        deezerId: a.id,
        type: "single",
        title: a.title,
        artist: a.artist?.name || "Artiste inconnu",
        coverUrl: a.cover_medium,
        releaseDate: a.release_date,
        previewUrl: null,
      }))
      .sort((x, y) => new Date(y.releaseDate || 0) - new Date(x.releaseDate || 0));

    return Response.json({ albums, singles });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recuperation des donnees artiste" }, { status: 500 });
  }
}
