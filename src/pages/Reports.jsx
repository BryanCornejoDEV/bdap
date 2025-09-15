import Layout from "../components/Layout";
import DataTable from "../components/DataTable";

const rows = [
  { month: "Ene", revenue: 12000, orders: 320 },
  { month: "Feb", revenue: 15500, orders: 380 },
  { month: "Mar", revenue: 14200, orders: 350 },
  { month: "Abr", revenue: 21000, orders: 480 },
  { month: "May", revenue: 18500, orders: 420 },
  { month: "Jun", revenue: 22000, orders: 510 },
];

export default function Reports() {
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-3">Reportes</h1>
      <DataTable data={rows} />
    </Layout>
  );
}
