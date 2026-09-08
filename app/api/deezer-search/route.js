function relevanceScore(query, text) {
  if (!text) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  const words = q.split(/\s+/);
  const matchedWords = words.filter((w) => t.includes(w)).length;
  return (matchedWords / words.length) * 30;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || !query.trim()) {
    return Response.json({ results: [] });
  }

  try {
    const [albumRes, trackRes, artistRes] = await Promise.all([
      fetch(`https://api.deezer.com/search/album?q=${encodeURIComponent(query)}&limit=10`),
      fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(query)}&limit=10`),
      fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(query)}&limit=8`),
    ]);

    const albumData = await albumRes.json();
    const trackData = await trackRes.json();
    const artistData = await artistRes.json();

    const seenAlbumIds = new Set();
    const albums = (albumData.data || [])
      .filter((a) => {
        if (seenAlbumIds.has(a.id)) return false;
        seenAlbumIds.add(a.id);
        return true;
      })
      .map((a) => {
        const artistName = a.artist?.name || "Artiste inconnu";
        const score = Math.max(
          relevanceScore(query, a.title),
          relevanceScore(query, artistName) * 0.7
        );
        return {
          kind: "album",
          id: `deezer-album-${a.id}`,
          deezerId: a.id,
          type: "album",
          title: a.title,
          artist: artistName,
          coverUrl: a.cover_medium,
          trackCount: a.nb_tracks,
          score,
        };
      });

    const tracks = (trackData.data || []).map((t) => {
      const artistName = t.artist?.name || "Artiste inconnu";
      const score = Math.max(
        relevanceScore(query, t.title),
        relevanceScore(query, artistName) * 0.7
      );
      return {
        kind: "track",
        id: `deezer-track-${t.id}`,
        deezerId: t.id,
        type: "single",
        title: t.title,
        artist: artistName,
        coverUrl: t.album?.cover_medium,
        previewUrl: t.preview,
        albumTitle: t.album?.title,
        score,
      };
    });

    const artists = (artistData.data || []).map((ar) => ({
      kind: "artist",
      id: `deezer-artist-${ar.id}`,
      artistId: ar.id,
      name: ar.name,
      pictureUrl: ar.picture_medium,
      nbAlbum: ar.nb_album,
      nbFan: ar.nb_fan,
      score: relevanceScore(query, ar.name),
    }));

    const results = [...artists, ...albums, ...tracks].sort((a, b) => b.score - a.score);

    return Response.json({ results });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recherche Deezer" }, { status: 500 });
  }
}
