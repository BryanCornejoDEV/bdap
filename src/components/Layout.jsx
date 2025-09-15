import NavBar from "./NavBar";
import Sidebar from "./Sidebar";


export default function Layout({ children }){
return (
<div className="min-h-screen">
<NavBar />
<div className="mx-auto max-w-7xl px-3 md:px-6 py-4 md:py-6">
<div className="flex gap-4">
<Sidebar />
<main className="flex-1 grid gap-4">{children}</main>
</div>
</div>
</div>
);
}