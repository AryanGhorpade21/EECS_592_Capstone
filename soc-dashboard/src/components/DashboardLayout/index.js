import SystemStatusCards from "../SystemStatusCards";
import SeverityChart from "../SeverityChart";
import RuleHitsChart from "../RuleHitsChart";
import RecentAlertsTable from "../RecentAlertsTable";

export default function DashboardLayout() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>SOC Dashboard</h1>

      <SystemStatusCards />

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <SeverityChart />
        <RuleHitsChart />
      </div>

      <div style={{ marginTop: "20px" }}>
        <RecentAlertsTable />
      </div>
    </div>
  );
}


