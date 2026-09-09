"use client";

import { useEffect, useRef } from "react";

/**
 * Quand `isOpen` devient vrai, on ajoute une entree dans l'historique du navigateur.
 * Si l'utilisateur appuie sur le bouton retour du telephone pendant que c'est ouvert,
 * on intercepte ca pour fermer la fenetre (onClose) au lieu de quitter la page/l'app.
 */
export default function useBackButtonClose(isOpen, onClose) {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      window.history.pushState({ mtOverlay: true }, "");
    }

    if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        onClose();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
