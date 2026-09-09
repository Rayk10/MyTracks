function escapeLucene(text) {
  // echappe les caracteres speciaux de la syntaxe de recherche MusicBrainz (Lucene)
  return text.replace(/[+\-!(){}[\]^"~*?:\\/]/g, " ").replace(/\s+/g, " ").trim();
}

async function queryMusicBrainz(query) {
  const url = `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(
    query
  )}&fmt=json&limit=5`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "MyTracks/1.0 (https://my-tracks-kohl.vercel.app)",
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data["release-groups"] || [];
}

function extractType(group) {
  const secondaryTypes = group["secondary-types"] || [];
  const primaryType = group["primary-type"] || "";

  if (secondaryTypes.includes("Mixtape/Street")) return "mixtape";
  if (primaryType === "EP") return "ep";
  if (primaryType === "Album") return "album";
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");

  if (!artist || !title) {
    return Response.json({ releaseType: null });
  }

  const cleanArtist = escapeLucene(artist);
  const cleanTitle = escapeLucene(title);

  try {
    // Premier essai : artiste + titre precis
    let groups = await queryMusicBrainz(`artist:"${cleanArtist}" AND releasegroup:"${cleanTitle}"`);
    let best = groups.find((g) => g.score >= 70);

    // Si rien de convaincant, on relache un peu la contrainte (titre seul, avec l'artiste en filtre plus souple)
    if (!best) {
      groups = await queryMusicBrainz(`${cleanArtist} ${cleanTitle}`);
      best = groups.find((g) => g.score >= 85);
    }

    if (!best) {
      return Response.json({ releaseType: null });
    }

    return Response.json({ releaseType: extractType(best) });
  } catch (err) {
    return Response.json({ releaseType: null });
  }
}
