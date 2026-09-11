"use client";

import { useEffect, useRef } from "react";

/**
 * Pile partagee entre toutes les fenetres ouvertes actuellement (accueil, fiche album,
 * fiche artiste...). On s'en sert pour ne fermer que la DERNIERE fenetre ouverte quand
 * on appuie sur le bouton retour, meme si plusieurs sont empilees en meme temps.
 */
let overlayStack = [];
let listenerAttached = false;
let closingViaPopstate = false;

function ensureListener() {
  if (listenerAttached || typeof window === "undefined") return;
  listenerAttached = true;
  window.addEventListener("popstate", () => {
    const top = overlayStack.pop();
    if (top) {
      closingViaPopstate = true;
      top.onCloseRef.current();
      setTimeout(() => {
        closingViaPopstate = false;
      }, 0);
    }
  });
}

export default function useBackButtonClose(isOpen, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const idRef = useRef(null);
  if (idRef.current === null) {
    idRef.current = Math.random().toString(36).slice(2);
  }
  const wasOpenRef = useRef(false);

  useEffect(() => {
    ensureListener();
  }, []);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      overlayStack.push({ id: idRef.current, onCloseRef });
      window.history.pushState({ mtOverlay: true }, "");
    } else if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
      const wasStillInStack = overlayStack.some((o) => o.id === idRef.current);
      overlayStack = overlayStack.filter((o) => o.id !== idRef.current);

      // Fermee via un bouton de l'interface (pas le bouton retour du telephone) :
      // on retire aussi l'entree d'historique correspondante pour rester synchronise.
      if (wasStillInStack && !closingViaPopstate) {
        window.history.back();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
}
