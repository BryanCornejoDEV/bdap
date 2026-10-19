import { useState, useEffect } from "react";
import NavBar from "./NavBar";
import Sidebar from "./Sidebar";
import CommandPalette from "./CommandPalette";

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener("bdap:open-command-palette", onOpen);
    return () => window.removeEventListener("bdap:open-command-palette", onOpen);
  }, []);

  return (
    <div className="min-h-screen flex">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <NavBar
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-7xl w-full mx-auto grid gap-5 content-start">
          {children}
        </main>
      </div>
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}
