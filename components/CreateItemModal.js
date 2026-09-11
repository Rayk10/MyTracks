"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";

export default function CreateItemModal({ userId, onClose, onCreated }) {
  const [type, setType] = useState("album");
  const [releaseType, setReleaseType] = useState("album");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [trackCount, setTrackCount] = useState(1);
  const [trackNames, setTrackNames] = useState([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCoverChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleTrackCountChange = (n) => {
    const count = Math.max(1, Math.min(50, n));
    setTrackCount(count);
    setTrackNames((prev) => {
      const updated = [...prev];
      while (updated.length < count) updated.push("");
      return updated.slice(0, count);
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim() || !artist.trim()) {
      setError("Le titre et l'artiste sont obligatoires.");
      return;
    }
    setSaving(true);
    const supabase = createClient();

    try {
      let coverUrl = null;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("covers").upload(path, coverFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("covers").getPublicUrl(path);
        coverUrl = publicUrlData.publicUrl;
      }

      const itemId = `custom-${crypto.randomUUID()}`;

      const { error: itemError } = await supabase.from("catalog_items").insert({
        id: itemId,
        type,
        release_type: type === "album" ? releaseType : null,
        title: title.trim(),
        artist: artist.trim(),
        year: year ? parseInt(year, 10) : null,
        genre: genre.trim() || null,
        cover_url: coverUrl,
        created_by: userId,
      });
      if (itemError) throw itemError;

      if (type === "album") {
        const rows = trackNames.map((name, i) => ({
          item_id: itemId,
          track_index: i + 1,
          title: name.trim() || `Piste ${i + 1}`,
        }));
        const { error: tracksError } = await supabase.from("custom_tracks").insert(rows);
        if (tracksError) throw tracksError;
      }

      setSaving(false);
      onCreated({
        id: itemId,
        type,
        title: title.trim(),
        artist: artist.trim(),
        coverUrl,
      });
    } catch (err) {
      setSaving(false);
      setError(err.message || "Une erreur est survenue.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end z-40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 w-full max-w-md mx-auto rounded-t-2xl p-6 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-base">Ajouter un projet / single</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setType("album")}
            className={`flex-1 rounded-full py-2 text-sm font-bold ${
              type === "album" ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-300"
            }`}
          >
            Projet
          </button>
          <button
            onClick={() => setType("single")}
            className={`flex-1 rounded-full py-2 text-sm font-bold ${
              type === "single" ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-300"
            }`}
          >
            Single
          </button>
        </div>

        {type === "album" && (
          <div className="flex gap-2 mb-5">
            {[
              { key: "album", label: "Album" },
              { key: "ep", label: "EP" },
              { key: "mixtape", label: "Mixtape" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setReleaseType(opt.key)}
                className={`flex-1 rounded-full py-1.5 text-xs font-bold ${
                  releaseType === opt.key ? "bg-mtgold text-black" : "bg-white/[0.04] text-zinc-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center mb-5">
          <label className="cursor-pointer">
            {coverPreview ? (
              <img src={coverPreview} alt="" className="w-28 h-28 rounded-xl object-cover" />
            ) : (
              <div className="w-28 h-28 rounded-xl border border-dashed border-zinc-600 flex items-center justify-center">
                <span className="text-zinc-500 text-xs text-center px-2">
                  Ajouter
                  <br />
                  une pochette
                </span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
          </label>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre"
          className="w-full bg-white/[0.06] rounded-lg px-4 py-2.5 text-sm outline-none mb-3"
        />
        <input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Artiste"
          className="w-full bg-white/[0.06] rounded-lg px-4 py-2.5 text-sm outline-none mb-3"
        />
        <div className="flex gap-3 mb-3">
          <input
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Annee"
            inputMode="numeric"
            className="flex-1 min-w-0 bg-white/[0.06] rounded-lg px-4 py-2.5 text-sm outline-none"
          />
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="Genre"
            className="flex-1 min-w-0 bg-white/[0.06] rounded-lg px-4 py-2.5 text-sm outline-none"
          />
        </div>

        {type === "album" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-xs text-zinc-400 flex-1">Nombre de pistes</p>
              <button
                onClick={() => handleTrackCountChange(trackCount - 1)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                −
              </button>
              <span className="text-sm font-bold w-6 text-center">{trackCount}</span>
              <button
                onClick={() => handleTrackCountChange(trackCount + 1)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                +
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-2">Noms des pistes (optionnel)</p>
            <div className="flex flex-col gap-2 mb-5">
              {trackNames.map((name, i) => (
                <input
                  key={i}
                  value={name}
                  onChange={(e) => {
                    const updated = [...trackNames];
                    updated[i] = e.target.value;
                    setTrackNames(updated);
                  }}
                  placeholder={`Piste ${i + 1}`}
                  className="w-full bg-white/[0.06] rounded-lg px-4 py-2 text-sm outline-none"
                />
              ))}
            </div>
          </>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-mtgold text-black rounded-full py-3 font-bold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saving ? "..." : "CREER"}
        </button>
      </div>
    </div>
  );
}
