"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export default function SplashPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/home");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-extrabold text-mtgold mb-10">MYTRACKS</h1>
      <button
        onClick={() => router.push("/signup")}
        className="w-full max-w-xs bg-mtgold text-black rounded-full py-3 font-bold mb-3"
      >
        S'INSCRIRE
      </button>
      <button
        onClick={() => router.push("/login")}
        className="w-full max-w-xs border border-zinc-700 text-white rounded-full py-3 font-semibold"
      >
        DEJA UN COMPTE ?
      </button>
    </div>
  );
}
