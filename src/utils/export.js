import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";


export function exportToPDF({ title = "Reporte", rows = [] }) {
const doc = new jsPDF();
doc.text(title, 14, 16);
if (rows.length) {
const headers = Object.keys(rows[0]);
const body = rows.map((r) => headers.map((h) => r[h]));
autoTable(doc, { head: [headers], body });
}
doc.save(`${title}.pdf`);
}


export function exportToExcel({ sheetName = "Data", rows = [] }) {
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, sheetName);
const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
saveAs(new Blob([wbout], { type: "application/octet-stream" }), `${sheetName}.xlsx`);
}

export function exportToCSV({ filename = "data.csv", rows = [] }) {
	if (!rows.length) {
		saveAs(new Blob([""], { type: "text/csv;charset=utf-8;" }), filename);
		return;
	}
	const headers = Object.keys(rows[0]);
	const escapeCsv = (val) => {
		if (val == null) return "";
		const s = String(val).replace(/"/g, '""');
		if (s.search(/[",\n;]/g) >= 0) return '"' + s + '"';
		return s;
	};
	const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(","))].join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	saveAs(blob, filename);
}