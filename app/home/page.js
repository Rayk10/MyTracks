"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("pseudo")
        .eq("id", session.user.id)
        .single();
      setProfile(data);
      setLoading(false);
    });
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <h1 className="text-mtgold text-xl font-extrabold mb-6">MYTRACKS</h1>
      <p className="text-lg font-bold mb-2">Salut, {profile?.pseudo} 👋</p>
      <p className="text-zinc-400 text-sm mb-8">
        Ton compte est connecte a la vraie base de donnees. On va maintenant
        rebrancher toutes les fonctionnalites du prototype une par une
        (recherche, notation, stats...).
      </p>
      <button
        onClick={handleLogout}
        className="border border-zinc-700 rounded-lg px-4 py-2 text-sm"
      >
        Se deconnecter
      </button>
    </div>
  );
}
