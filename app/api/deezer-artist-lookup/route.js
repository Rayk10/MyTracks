export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return Response.json({ artist: null });
  }

  try {
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`);
    const data = await res.json();
    const match = (data.data || [])[0];

    if (!match) {
      return Response.json({ artist: null });
    }

    return Response.json({
      artist: {
        artistId: match.id,
        name: match.name,
        pictureUrl: match.picture_medium,
        nbFan: match.nb_fan,
      },
    });
  } catch (err) {
    return Response.json({ artist: null });
  }
}
