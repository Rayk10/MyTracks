export default function StreamingLinks({ title, artist, deezerId }) {
  const query = encodeURIComponent(`${title} ${artist}`);

  const links = [
    { name: "Spotify", url: `https://open.spotify.com/search/${query}` },
    { name: "Apple Music", url: `https://music.apple.com/search?term=${query}` },
    {
      name: "Deezer",
      url: deezerId ? `https://www.deezer.com/search/${query}` : `https://www.deezer.com/search/${query}`,
    },
    { name: "SoundCloud", url: `https://soundcloud.com/search?q=${query}` },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {links.map((l) => (
        <a
          key={l.name}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-white/[0.06] rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          <span>▷</span> {l.name}
        </a>
      ))}
    </div>
  );
}
