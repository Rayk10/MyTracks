export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return Response.json({ albums: [], tracks: [] });
  }

  try {
    const [albumRes, trackRes] = await Promise.all([
      fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=10`),
      fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=10`),
    ]);

    const albumData = await albumRes.json();
    const trackData = await trackRes.json();

    const albums = (albumData.data || []).map((a) => ({
      id: `deezer-album-${a.id}`,
      deezerId: a.id,
      type: "album",
      title: a.title,
      artist: a.artist?.name || "Artiste inconnu",
      coverUrl: a.cover_medium,
      trackCount: a.nb_tracks,
    }));

    const tracks = (trackData.data || []).map((t) => ({
      id: `deezer-track-${t.id}`,
      deezerId: t.id,
      type: "single",
      title: t.title,
      artist: t.artist?.name || "Artiste inconnu",
      coverUrl: t.album?.cover_medium,
      previewUrl: t.preview,
      albumTitle: t.album?.title,
    }));

    return Response.json({ albums, tracks });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recherche Deezer" }, { status: 500 });
  }
}
