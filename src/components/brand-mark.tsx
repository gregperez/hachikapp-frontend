"use client";

import { PawPrint } from "lucide-react";
import { splitBrandName } from "@/lib/settings";

export function BrandMark({
  name,
  logoUrl,
  light = false,
}: {
  name: string;
  logoUrl?: string;
  light?: boolean;
}) {
  const { lead, accent } = splitBrandName(name);
  return (
    <span className={light ? "brand brand-light" : "brand"}>
      <span className="brand-mark">
        {logoUrl ? (
          // User-configured https/path logos are not in the Next image domain allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" />
        ) : (
          <PawPrint size={21} />
        )}
      </span>
      <span>{lead}{accent ? <span>{accent}</span> : null}</span>
    </span>
  );
}
