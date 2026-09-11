export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artistName = searchParams.get("artist");
  const query = searchParams.get("q");

  if (!artistName || !query) {
    return Response.json({ tracks: [] });
  }

  const mapTracks = (list) => {
    const seen = new Set();
    return list
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
  };

  try {
    // Premier essai : la recherche avancee precise de Deezer (artiste + titre)
    const advancedQuery = `artist:"${artistName}" track:"${query}"`;
    const advancedRes = await fetch(
      `https://api.deezer.com/search/track?q=${encodeURIComponent(advancedQuery)}&limit=20`
    );
    const advancedData = await advancedRes.json();
    let tracks = mapTracks(advancedData.data || []);

    // Si ca ne donne rien (Deezer est parfois trop strict sur le nom exact de l'artiste),
    // on fait une recherche large puis on filtre nous-memes sur le nom de l'artiste.
    if (tracks.length === 0) {
      const plainRes = await fetch(
        `https://api.deezer.com/search/track?q=${encodeURIComponent(artistName + " " + query)}&limit=25`
      );
      const plainData = await plainRes.json();
      const targetName = artistName.trim().toLowerCase();
      const filtered = (plainData.data || []).filter((t) => {
        const trackArtist = (t.artist && t.artist.name ? t.artist.name : "").trim().toLowerCase();
        return trackArtist === targetName || trackArtist.includes(targetName) || targetName.includes(trackArtist);
      });
      tracks = mapTracks(filtered);
    }

    return Response.json({ tracks });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recherche dans le catalogue de l'artiste" }, { status: 500 });
  }
}
