export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artistId = searchParams.get("id");

  if (!artistId) {
    return Response.json({ error: "id manquant" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.deezer.com/artist/${artistId}/albums?limit=50`);
    const data = await res.json();

    const seenIds = new Set();
    const albums = (data.data || [])
      .filter((a) => {
        if (seenIds.has(a.id)) return false;
        seenIds.add(a.id);
        return true;
      })
      .map((a) => ({
        id: `deezer-album-${a.id}`,
        deezerId: a.id,
        type: "album",
        title: a.title,
        artist: a.artist?.name || "Artiste inconnu",
        coverUrl: a.cover_medium,
        trackCount: a.nb_tracks,
        releaseDate: a.release_date,
      }));

    return Response.json({ albums });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recuperation des albums" }, { status: 500 });
  }
}
