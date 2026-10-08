import { useState } from "react";

export default function DataTable({ data }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  if (!data || data.length === 0) return <p className="chip">No hay datos</p>;
  const headers = Object.keys(data[0]);
  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const A = a[sortKey], B = b[sortKey];
    if (A < B) return sortAsc ? -1 : 1;
    if (A > B) return sortAsc ? 1 : -1;
    return 0;
  });
  const start = (page - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);
  const totalPages = Math.ceil(data.length / pageSize);
  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} className="cursor-pointer select-none" onClick={() => toggleSort(h)}>
                  {h} {sortKey === h ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, i) => (
              <tr key={i}>
                {headers.map((h) => (
                  <td key={h}>{row[h]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
        <span className="text-xs text-muted num">Página {page} de {totalPages}</span>
        <div className="flex gap-1.5">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn btn-ghost btn-sm">Anterior</button>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn btn-ghost btn-sm">Siguiente</button>
        </div>
      </div>
    </div>
  );
}
