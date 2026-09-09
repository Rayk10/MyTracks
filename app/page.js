"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

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
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden max-w-md mx-auto">
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "28%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 280,
          height: 280,
          background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      <div className="mb-10 relative">
        <Logo size={110} />
      </div>
      <button
        onClick={() => router.push("/signup")}
        className="w-full max-w-xs bg-mtgold text-black rounded-full py-3 font-bold mb-3 active:scale-95 transition-transform"
      >
        S&apos;INSCRIRE
      </button>
      <button
        onClick={() => router.push("/login")}
        className="w-full max-w-xs border border-zinc-700 text-white rounded-full py-3 font-semibold active:scale-95 transition-transform"
      >
        DÉJÀ UN COMPTE ?
      </button>
    </div>
  );
}
