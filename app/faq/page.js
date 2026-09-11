"use client";

import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-base font-bold text-mtgold mb-2">{title}</p>
      <div className="text-sm text-zinc-300 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export default function FaqPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen px-4 pt-6 pb-28 max-w-md mx-auto">
      <div className="mt-page-enter">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/profile")} className="text-xl">
            ←
          </button>
          <p className="font-extrabold text-lg">Aide &amp; FAQ</p>
        </div>

        <Section title="D'où viennent les musiques de l'app ?">
          <p>
            MyTracks n&apos;a pas sa propre base de données musicale. L&apos;app s&apos;appuie
            entièrement sur le catalogue de <strong>Deezer</strong> pour la recherche, les
            pochettes, les extraits audio et les discographies d&apos;artistes.
          </p>
        </Section>

        <Section title="Pourquoi un album ou un titre peut être introuvable ?">
          <p>Plusieurs raisons possibles, toutes indépendantes de l&apos;app :</p>
          <p>
            <strong>Restriction géographique.</strong> Certaines sorties sont bloquées par Deezer
            dans certains pays pour des raisons de droits de distribution. Si notre serveur (basé
            aux États-Unis) interroge Deezer, un titre bloqué pour les États-Unis peut être
            invisible même si tu es dans un pays où il est disponible.
          </p>
          <p>
            <strong>Sortie non-officielle.</strong> Les mixtapes de fuites (leaks) compilées par
            des fans ne sont parfois pas distribuées officiellement et n&apos;existent tout
            simplement pas dans le catalogue de Deezer.
          </p>
          <p>
            <strong>Solution</strong> : utilise le bouton <strong>&quot;+ Ajouter un projet /
            single&quot;</strong> dans &quot;Mes notes&quot; pour créer la fiche toi-même, avec ta
            propre pochette et tes propres titres.
          </p>
        </Section>

        <Section title="Comment l'app sait si c'est un Album, un EP ou une Mixtape ?">
          <p>
            La distinction Album/EP est déterminée automatiquement à partir des données
            officielles de Deezer. Pour les mixtapes (que Deezer ne différencie pas des albums),
            l&apos;app consulte en complément <strong>MusicBrainz</strong>, une base de données
            musicale collaborative. Si aucune des deux sources n&apos;a l&apos;information, le
            projet reste classé par défaut comme &quot;Album&quot;.
          </p>
        </Section>

        <Section title="Les liens Spotify / Apple Music / SoundCloud sont-ils exacts ?">
          <p>
            Non, ce sont des <strong>liens de recherche</strong> (titre + artiste) vers ces
            plateformes, pas des liens directs garantis vers le bon morceau exact. Deezer ne
            fournit pas ces correspondances précises pour les autres services.
          </p>
        </Section>

        <Section title="Qui peut voir mes notes et mes commentaires ?">
          <p>
            Tes notes et commentaires sont visibles par tous les utilisateurs de l&apos;app dans
            la section &quot;Avis de la communauté&quot; de chaque fiche (comme sur une vidéo
            YouTube). Tes amis apparaissent en priorité, avec un badge &quot;AMI&quot;.
          </p>
        </Section>

        <Section title="À quoi sert &quot;À écouter plus tard&quot; ?">
          <p>
            C&apos;est une liste d&apos;envie, comme sur Letterboxd. Ajoute un album ou un titre
            depuis sa fiche pour le retrouver plus tard, sans avoir à le noter tout de suite.
          </p>
        </Section>

        <Section title="Comment fonctionne la note d'un album ?">
          <p>
            Par défaut, elle se calcule automatiquement à partir des titres que tu notes
            individuellement. Tu peux à tout moment ajuster le curseur toi-même et enregistrer :
            elle devient alors fixée manuellement, et ne changera plus toute seule (un bouton
            permet de revenir au calcul automatique).
          </p>
        </Section>

        <Section title="Un souci ou une idée ?">
          <p>
            L&apos;app est en développement continu. Si quelque chose ne fonctionne pas comme
            attendu, ou si tu as une idée d&apos;amélioration, écris-nous à :
          </p>
          <a
            href="mailto:contact.mytracksmusic@gmail.com"
            className="inline-block bg-mtgold text-black font-bold rounded-full px-4 py-2 text-sm"
          >
            contact.mytracksmusic@gmail.com
          </a>
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}
