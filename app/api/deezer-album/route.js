export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const albumId = searchParams.get("id");

  if (!albumId) {
    return Response.json({ error: "id manquant" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.deezer.com/album/${albumId}`);
    const data = await res.json();

    const tracks = (data.tracks?.data || []).map((t, i) => ({
      index: t.track_position || i + 1,
      title: t.title,
      previewUrl: t.preview || null,
    }));

    return Response.json({
      tracks,
      releaseDate: data.release_date || null,
      genres: (data.genres?.data || []).map((g) => g.name),
    });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recuperation de l'album" }, { status: 500 });
  }
}
