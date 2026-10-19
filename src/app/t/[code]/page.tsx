import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublicProfileView } from "@/components/public-profile";
import { clientIpFrom } from "@/lib/session-proxy";
import { loadPublicTag } from "@/lib/tags";

// Neutral on purpose: link previews must not leak the pet's name.
export const metadata: Metadata = {
  title: "Hachikapp",
  robots: { index: false, follow: false },
};

export default async function PublicTagPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const result = await loadPublicTag(code, clientIpFrom(await headers()));
  return <PublicProfileView code={code} result={result} />;
}
