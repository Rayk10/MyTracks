"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabaseClient";

export default function ListPickerButton({ userId, itemPayload }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedTo, setAddedTo] = useState(new Set());

  const openPicker = async () => {
    setOpen(true);
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("custom_lists")
      .select("id, name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLists(data || []);
    setLoading(false);
  };

  const addToList = async (listId) => {
    const supabase = createClient();
    await supabase.from("catalog_items").upsert(itemPayload);
    await supabase
      .from("custom_list_items")
      .upsert({ list_id: listId, item_id: itemPayload.id }, { onConflict: "list_id,item_id" });
    setAddedTo((prev) => new Set(prev).add(listId));
  };

  return (
    <>
      <button
        onClick={openPicker}
        className="flex-1 bg-white/[0.06] rounded-xl py-3 text-sm font-bold text-mtgold active:scale-95 transition-transform"
      >
        + Liste
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-base">Ajouter à une liste</p>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg"
              >
                ×
              </button>
            </div>
            {loading && <Spinner size={20} />}
            {!loading && lists.length === 0 && (
              <p className="text-zinc-400 text-sm">
                Tu n&apos;as encore aucune liste. Créé-en une depuis &quot;Mes notes&quot;.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {lists.map((list) => (
                <div key={list.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{list.name}</span>
                  <button
                    onClick={() => addToList(list.id)}
                    className={`text-xs font-bold rounded-full px-3 py-1.5 ${
                      addedTo.has(list.id) ? "bg-mtgold text-black" : "bg-white/10 text-white"
                    }`}
                  >
                    {addedTo.has(list.id) ? "Ajoute" : "Ajouter"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
