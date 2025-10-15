import { NavLink } from "react-router-dom";

const itemBase =
  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors";
const iconBox =
  "w-9 h-9 grid place-items-center rounded-lg bg-white/20 backdrop-blur";

export default function Sidebar(){
  const active = ({ isActive }) =>
    isActive
      ? `${itemBase} md2-grad shadow text-white`
      : `${itemBase} hover:bg-white/10 text-white/80`;

  return (
    <aside className="hidden md:flex w-72 shrink-0" aria-label="Barra lateral">
      <div
        className="md2-card-lg p-4 w-full"
        style={{ background: "linear-gradient(180deg,#0f172a,#0b1220)" }}
      >
        <div className="flex items-center gap-3 px-2 pt-2 pb-5">
          <div className={`${iconBox} bg-white/10`}>🧭</div>
          <div>
            <p className="text-white font-semibold leading-tight">Material Dashboard</p>
            <p className="text-white/60 text-xs">BDAP</p>
          </div>
        </div>

  <nav className="grid gap-2" aria-label="Navegación principal">
          <NavLink to="/" end className={active}>📊 Dashboard</NavLink>
          <NavLink to="/reports" className={active}>📄 Reports</NavLink>
          <a className={`${itemBase} hover:bg-white/10 text-white/80`} href="#">
            🔔 Notifications
          </a>
          <a className={`${itemBase} hover:bg-white/10 text-white/80`} href="#">
            👤 Profile
          </a>
        </nav>

        <div className="mt-6 p-4 md2-card bg-white/10 border-white/10 text-white/90">
          <p className="text-sm font-semibold">Upgrade</p>
          <p className="text-xs opacity-80 mb-3">Unlock pro widgets & charts.</p>
          <button className="md2-grad w-full py-2 rounded-lg font-semibold">Upgrade to Pro</button>
        </div>
      </div>
    </aside>
  );
}
