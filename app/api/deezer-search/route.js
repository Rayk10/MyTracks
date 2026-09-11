import { createClient } from "@/lib/supabaseClient";

function relevanceScore(query, text) {
  if (!text) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  // correspondance partielle mot par mot
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
      .filter((a) => a.title && a.title.trim() && a.artist && a.artist.name && a.artist.name.trim())
      .map((a) => {
        const artistName = a.artist.name;
        const score = Math.max(
          relevanceScore(query, a.title),
          relevanceScore(query, artistName) * 0.7
        );
        return {
          kind: "album",
          id: `deezer-album-${a.id}`,
          deezerId: a.id,
          type: "album",
          releaseType: a.record_type === "ep" ? "ep" : "album",
          title: a.title,
          artist: artistName,
          artistId: a.artist.id,
          coverUrl: a.cover_medium,
          trackCount: a.nb_tracks,
          score,
        };
      });

    const tracks = (trackData.data || [])
      .filter((t) => t.title && t.title.trim() && t.artist && t.artist.name && t.artist.name.trim())
      .map((t) => {
        const artistName = t.artist.name;
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
        artistId: t.artist.id,
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

    const results = [...artists, ...albums, ...tracks].sort((a, b) => b.score - a.score);

    return Response.json({ results });
  } catch (err) {
    return Response.json({ error: "Erreur lors de la recherche Deezer" }, { status: 500 });
  }
}
