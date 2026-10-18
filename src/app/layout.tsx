import type { Metadata } from "next";
import { Inter, Nunito } from "next/font/google";
import { SettingsProvider } from "@/components/settings-provider";
import "./globals.css";

// Manual de marca, sección 11: titulares redondeados y amables (Nunito ExtraBold)
// e interfaz legible en celular con soporte completo del español (Inter).
const nunito = Nunito({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-nunito", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Hachikapp",
  description: "El carnet de tu mascota, siempre contigo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${nunito.variable} ${inter.variable}`}>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
