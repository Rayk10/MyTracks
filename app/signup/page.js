"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

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

    // 1. Creer le compte (email + mot de passe)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // 2. Creer le profil associe (pseudo, etc.)
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        pseudo: pseudo.trim(),
      });
      if (profileError) {
        setError("Compte cree, mais erreur sur le profil : " + profileError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    router.push("/home");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10">
      <h1 className="text-2xl font-bold text-mtgold text-center mb-1">MYTRACKS</h1>
      <h2 className="text-xl font-bold text-center mb-6">Cree ton compte</h2>

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
        className="w-full bg-zinc-900 border border-zinc-700 rounded-full px-4 py-3 mb-3 outline-none"
      />
      <input
        type="text"
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        placeholder="Ton pseudo"
        className="w-full bg-zinc-900 border border-zinc-700 rounded-full px-4 py-3 mb-4 outline-none"
      />

      {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

      <button
        onClick={handleSignup}
        disabled={loading}
        className="w-full bg-mtgold text-black rounded-full py-3 font-bold mb-4 disabled:opacity-50"
      >
        {loading ? "..." : "SIGN UP"}
      </button>

      <p
        onClick={() => router.push("/login")}
        className="text-center text-sm text-zinc-400 cursor-pointer"
      >
        DEJA UN COMPTE ?
      </p>
    </div>
  );
}
