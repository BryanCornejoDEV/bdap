import { useState } from "react";


export default function DataTable({ data }) {
const [sortKey, setSortKey] = useState(null);
const [sortAsc, setSortAsc] = useState(true);
const [page, setPage] = useState(1);
const pageSize = 5;
if (!data || data.length === 0) return <p className="pill">No hay datos</p>;
const headers = Object.keys(data[0]);
const sorted = [...data].sort((a, b) => {
if (!sortKey) return 0; const A=a[sortKey], B=b[sortKey];
if (A < B) return sortAsc ? -1 : 1; if (A > B) return sortAsc ? 1 : -1; return 0;
});
const start = (page - 1) * pageSize; const paginated = sorted.slice(start, start + pageSize);
const totalPages = Math.ceil(data.length / pageSize);
const toggleSort = (key) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true);} };


return (
<div className="md2-card overflow-hidden">
<table className="w-full text-sm">
<thead>
<tr className="glass-strong">
{headers.map((h) => (
<th key={h} className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort(h)}>
{h} {sortKey === h ? (sortAsc ? "▲" : "▼") : ""}
</th>
))}
</tr>
</thead>
<tbody>
{paginated.map((row, i) => (
<tr key={i} className="border-t" style={{ borderColor: "var(--border-outer)" }}>
{headers.map((h) => (
<td key={h} className="px-3 py-2">{row[h]}</td>
))}
</tr>
))}
</tbody>
</table>
<div className="flex justify-between items-center px-3 py-2 border-t" style={{ borderColor: "var(--border-outer)" }}>
<span className="text-xs opacity-80">Página {page} de {totalPages}</span>
<div className="flex gap-2">
<button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-glass disabled:opacity-40">◀</button>
<button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="btn-glass disabled:opacity-40">▶</button>
</div>
</div>
</div>
);
}