"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Entre ton email et ton mot de passe.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <div className="flex justify-center mb-6">
        <Logo size={64} />
      </div>
      <h2 className="text-xl font-bold text-center mb-6">Content de te revoir</h2>

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
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 mb-4">
        <span className="text-zinc-500">🔒</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ton mot de passe"
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-mtgold text-black rounded-full py-3 font-bold mb-4 disabled:opacity-50 active:scale-95 transition-transform"
      >
        {loading ? "..." : "SE CONNECTER"}
      </button>

      <p
        onClick={() => router.push("/signup")}
        className="text-center text-sm text-zinc-400 cursor-pointer font-semibold"
      >
        PAS ENCORE DE COMPTE ?
      </p>
    </div>
  );
}
