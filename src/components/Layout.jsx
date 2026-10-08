import { useState } from "react";
import NavBar from "./NavBar";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <NavBar onToggleMobileMenu={() => setMobileMenuOpen(true)} />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-6xl w-full mx-auto grid gap-5 content-start">
          {children}
        </main>
      </div>
    </div>
  );
}
