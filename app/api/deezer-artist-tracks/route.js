export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artistName = searchParams.get("artist");
  const query = searchParams.get("q");

  if (!artistName || !query) {
    return Response.json({ tracks: [] });
  }

  try {
    const advancedQuery = `artist:"${artistName}" track:"${query}"`;
    const res = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(advancedQuery)}&limit=20`);
    const data = await res.json();

    const seen = new Set();
    const tracks = (data.data || [])
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .filter((t) => t.title && t.title.trim())
      .map((t) => ({
        id: `deezer-single-${t.id}`,
        deezerId: t.id,
        type: "single",
        title: t.title,
        artist: t.artist ? t.artist.name : artistName,
        coverUrl: t.album ? t.album.cover_medium : null,
        previewUrl: t.preview || null,
      }));

    return Response.json({ tracks });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recherche dans le catalogue de l'artiste" }, { status: 500 });
  }
}
