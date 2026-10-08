import { Link } from "react-router-dom";

export default function NotFound(){
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center">
        <p className="text-5xl font-semibold num" style={{ color: "var(--accent)" }}>404</p>
        <h1 className="text-lg font-semibold mt-3">Página no encontrada</h1>
        <p className="text-sm text-muted mt-1 mb-5">La ruta que buscas no existe o fue movida.</p>
        <Link to="/" className="btn btn-primary">Volver al dashboard</Link>
      </div>
    </div>
  );
}
