import { BrandMark } from "@/components/brand-mark";

export default function PublicTagLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="public-page">
      <header className="public-header">
        <BrandMark name="Hachikapp" />
      </header>
      <main className="public-main">{children}</main>
      <footer className="public-footer">Quien encuentre a tu mascota puede contactarte. Tú decides qué ve.</footer>
    </div>
  );
}
