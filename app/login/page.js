"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

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
      <h1 className="text-2xl font-bold text-mtgold text-center mb-1">MYTRACKS</h1>
      <h2 className="text-xl font-bold text-center mb-6">Content de te revoir</h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Ton email"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-full px-4 py-3 mb-3 outline-none"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Ton mot de passe"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-full px-4 py-3 mb-4 outline-none"
      />

      {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-mtgold text-black rounded-full py-3 font-bold mb-4 disabled:opacity-50"
      >
        {loading ? "..." : "SE CONNECTER"}
      </button>

      <p
        onClick={() => router.push("/signup")}
        className="text-center text-sm text-zinc-400 cursor-pointer"
      >
        PAS ENCORE DE COMPTE ?
      </p>
    </div>
  );
}
