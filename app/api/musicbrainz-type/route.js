export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");

  if (!artist || !title) {
    return Response.json({ releaseType: null });
  }

  try {
    const query = `artist:"${artist}" AND releasegroup:"${title}"`;
    const url = `https://musicbrainz.org/ws/2/release-group/?query=${encodeURIComponent(
      query
    )}&fmt=json&limit=5`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "MyTracks/1.0 (https://my-tracks-kohl.vercel.app)",
      },
    });

    if (!res.ok) {
      return Response.json({ releaseType: null });
    }

    const data = await res.json();
    const groups = data["release-groups"] || [];

    // On ne garde que les correspondances vraiment proches (score de pertinence MusicBrainz eleve)
    const best = groups.find((g) => g.score >= 90) || null;

    if (!best) {
      return Response.json({ releaseType: null });
    }

    const secondaryTypes = best["secondary-types"] || [];
    const primaryType = best["primary-type"] || "";

    let releaseType = null;
    if (secondaryTypes.includes("Mixtape/Street")) {
      releaseType = "mixtape";
    } else if (primaryType === "EP") {
      releaseType = "ep";
    } else if (primaryType === "Album") {
      releaseType = "album";
    }

    return Response.json({ releaseType });
  } catch (err) {
    return Response.json({ releaseType: null });
  }
}
