export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return Response.json({ error: "name manquant" }, { status: 400 });
  }

  try {
    const genresRes = await fetch("https://api.deezer.com/genre");
    const genresData = await genresRes.json();

    const target = name.toLowerCase();
    const match = (genresData.data || []).find((g) => {
      const gname = (g.name || "").toLowerCase();
      return gname === target || gname.includes(target) || target.includes(gname);
    });

    if (!match) {
      return Response.json({ albums: [] });
    }

    const chartRes = await fetch(`https://api.deezer.com/chart/${match.id}/albums?limit=20`);
    const chartData = await chartRes.json();

    const seen = new Set();
    const albums = (chartData.data || [])
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
        title: a.title,
        artist: a.artist.name,
        coverUrl: a.cover_medium,
      }));

    return Response.json({ albums });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recuperation du genre" }, { status: 500 });
  }
}
