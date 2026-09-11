"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import ListCoverMosaic from "@/components/ListCoverMosaic";

export default function ListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.id;

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState(null);
  const [items, setItems] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "album" | "ep" | "mixtape" | "single"

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const loadList = async (uid) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("custom_lists")
      .select("id, name, custom_list_items(catalog_items(*))")
      .eq("id", listId)
      .eq("user_id", uid)
      .single();

    if (!data) {
      router.replace("/ratings");
      return;
    }
    setList({ id: data.id, name: data.name });
    setItems((data.custom_list_items || []).map((li) => li.catalog_items).filter(Boolean));
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      await loadList(session.user.id);
      setLoading(false);
    });
  }, [listId]);

  const saveName = async () => {
    if (!nameDraft.trim() || !list) return;
    const supabase = createClient();
    await supabase.from("custom_lists").update({ name: nameDraft.trim() }).eq("id", list.id);
    setList((prev) => ({ ...prev, name: nameDraft.trim() }));
    setEditingName(false);
  };

  const removeItem = async (itemId) => {
    const supabase = createClient();
    await supabase.from("custom_list_items").delete().eq("list_id", listId).eq("item_id", itemId);
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const runPickerSearch = async (e) => {
    e.preventDefault();
    if (!pickerQuery.trim()) return;
    setPickerLoading(true);
    try {
      const res = await fetch("/api/deezer-search?q=" + encodeURIComponent(pickerQuery));
      const data = await res.json();
      setPickerResults((data.results || []).filter((r) => r.kind !== "artist"));
    } catch (err) {
      setPickerResults([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const addItem = async (result) => {
    const supabase = createClient();
    const catalogId = result.id;

    await supabase.from("catalog_items").upsert({
      id: catalogId,
      type: result.kind === "album" ? "album" : "single",
      title: result.title,
      artist: result.artist,
      cover_url: result.coverUrl,
      deezer_id: result.deezerId ? String(result.deezerId) : null,
      preview_url: result.previewUrl || null,
    });

    await supabase.from("custom_list_items").upsert(
      { list_id: listId, item_id: catalogId },
      { onConflict: "list_id,item_id" }
    );

    if (!items.some((it) => it.id === catalogId)) {
      setItems((prev) => [
        ...prev,
        {
          id: catalogId,
          type: result.kind === "album" ? "album" : "single",
          title: result.title,
          artist: result.artist,
          cover_url: result.coverUrl,
        },
      ]);
    }
  };

  if (loading || !list) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-mtgold text-sm">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-16 max-w-md mx-auto">
      <div className="mt-page-enter">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/ratings")} className="text-xl">
          ←
        </button>
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="flex-1 bg-white/[0.06] border border-white/[0.06] rounded-lg px-3 py-1.5 text-base font-bold outline-none"
          />
        ) : (
          <p
            onClick={() => {
              setNameDraft(list.name);
              setEditingName(true);
            }}
            className="font-extrabold text-lg flex-1"
          >
            {list.name} <span className="text-zinc-500 text-sm">✎</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <ListCoverMosaic items={items} size={90} />
        <p className="text-xs text-zinc-400">
          {items.length} titre{items.length > 1 ? "s" : ""}
        </p>
      </div>

      <button
        onClick={() => {
          setPickerOpen(true);
          setPickerQuery("");
          setPickerResults([]);
        }}
        className="w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-dashed border-zinc-600 rounded-xl py-3 mb-6 text-sm font-bold text-mtgold"
      >
        + Ajouter des titres
      </button>

      {items.length === 0 && (
        <p className="text-zinc-400 text-sm">Liste vide pour l&apos;instant. Ajoute des titres avec le bouton ci-dessus.</p>
      )}

      {items.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          {[
            { key: "all", label: "Tout" },
            { key: "album", label: "Album" },
            { key: "ep", label: "EP" },
            { key: "mixtape", label: "Mixtape" },
            { key: "single", label: "Single" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                typeFilter === f.key ? "bg-mtgold text-black" : "bg-white/[0.06] text-zinc-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items
          .filter((it) => {
            if (typeFilter === "all") return true;
            if (typeFilter === "single") return it.type === "single";
            return it.type === "album" && (it.release_type || "album") === typeFilter;
          })
          .map((it) => (
          <div key={it.id} className="flex items-center gap-3">
            {it.cover_url ? (
              <img src={it.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{it.title}</p>
                {it.type === "album" && (
                  <span className="bg-white/10 text-zinc-300 text-[9px] font-bold rounded px-1 py-0.5 flex-shrink-0">
                    {it.release_type === "ep" ? "EP" : it.release_type === "mixtape" ? "MIXTAPE" : "ALBUM"}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">{it.artist}</p>
            </div>
            <button
              onClick={() => removeItem(it.id)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm flex-shrink-0"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end z-30"
          onClick={() => setPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-md mx-auto rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Ajouter des titres</p>
              <button
                onClick={() => setPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={runPickerSearch} className="flex gap-2 mb-4">
              <input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Chercher un album, un titre..."
                className="flex-1 bg-white/[0.06] rounded-full px-4 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={pickerLoading}
                className="bg-mtgold text-black rounded-full px-5 py-2 text-sm font-bold disabled:opacity-50"
              >
                {pickerLoading ? "..." : "Go"}
              </button>
            </form>

            <div className="flex flex-col gap-3">
              {pickerResults.map((r) => {
                const inList = items.some((it) => it.id === r.id);
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    {r.coverUrl ? (
                      <img src={r.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-zinc-800 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-zinc-400 truncate">{r.artist}</p>
                    </div>
                    <button
                      onClick={() => addItem(r)}
                      disabled={inList}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                        inList ? "bg-mtgold text-black" : "bg-white/10"
                      }`}
                    >
                      {inList ? "✓" : "+"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
