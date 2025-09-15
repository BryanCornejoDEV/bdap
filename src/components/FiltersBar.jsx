export default function FiltersBar({ filters, onChange }) {
return (
<div className="flex flex-wrap items-center gap-3 mb-4">
<select className="border bg-transparent p-2 rounded" value={filters.range} onChange={(e)=>onChange({ ...filters, range:e.target.value })}>
<option className="text-black" value="last_7">Últimos 7 días</option>
<option className="text-black" value="last_30">Últimos 30 días</option>
<option className="text-black" value="ytd">YTD</option>
</select>
<select className="border bg-transparent p-2 rounded" value={filters.source} onChange={(e)=>onChange({ ...filters, source:e.target.value })}>
<option className="text-black" value="all">Todas las fuentes</option>
<option className="text-black" value="ga">Google Analytics</option>
<option className="text-black" value="stripe">Stripe</option>
<option className="text-black" value="hubspot">HubSpot</option>
</select>
</div>
);
}