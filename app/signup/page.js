"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    if (!email.trim() || !password.trim() || !pseudo.trim()) {
      setError("Remplis tous les champs.");
      return;
    }
    setLoading(true);
    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { pseudo: pseudo.trim() },
      },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 max-w-md mx-auto mt-page-enter">
      <div className="flex justify-center mb-6">
        <Logo size={64} />
      </div>
      <h2 className="text-xl font-bold text-center mb-6">Cree ton compte</h2>

      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 mb-3">
        <span className="text-zinc-500">✉</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ton email"
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 mb-3">
        <span className="text-zinc-500">🔒</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ton mot de passe"
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 mb-4">
        <span className="text-zinc-500">@</span>
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Ton pseudo"
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

      <button
        onClick={handleSignup}
        disabled={loading}
        className="w-full bg-mtgold text-black rounded-full py-3 font-bold mb-4 disabled:opacity-50 active:scale-95 transition-transform"
      >
        {loading ? "..." : "SIGN UP"}
      </button>

      <p
        onClick={() => router.push("/login")}
        className="text-center text-sm text-zinc-400 cursor-pointer font-semibold"
      >
        DEJA UN COMPTE ?
      </p>
    </div>
  );
}
