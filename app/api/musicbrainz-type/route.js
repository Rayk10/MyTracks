import { getReleaseType } from "@/lib/musicbrainz";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist");
  const title = searchParams.get("title");

  const releaseType = await getReleaseType(artist, title);
  return Response.json({ releaseType });
}
