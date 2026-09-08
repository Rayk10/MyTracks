import "./globals.css";

export const metadata = {
  title: "MyTracks",
  description: "Note et decouvre de la musique avec tes amis",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
