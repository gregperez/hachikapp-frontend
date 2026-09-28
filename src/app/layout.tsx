import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Base Console",
  description: "Administración de usuarios, roles y accesos",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
