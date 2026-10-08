import NavBar from "./NavBar";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <NavBar />
        <main className="flex-1 px-4 md:px-8 py-6 max-w-6xl w-full mx-auto grid gap-5 content-start">
          {children}
        </main>
      </div>
    </div>
  );
}
