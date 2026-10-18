"use client";

import { petPhotoSrc } from "@/lib/pets";
import type { Pet } from "@/lib/types";
import { PawPrint } from "lucide-react";

export function PetAvatar({ pet, size = "medium" }: { pet: Pick<Pet, "name" | "photoUrl">; size?: "medium" | "large" | "hero" }) {
  const src = petPhotoSrc(pet.photoUrl);
  return (
    <span className={`pet-avatar pet-avatar-${size}`}>
      {src ? (
        // Photos are served by the authenticated API proxy, outside next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Foto de ${pet.name}`} />
      ) : (
        <PawPrint size={size === "hero" ? 46 : size === "large" ? 30 : 22} aria-hidden="true" />
      )}
    </span>
  );
}
