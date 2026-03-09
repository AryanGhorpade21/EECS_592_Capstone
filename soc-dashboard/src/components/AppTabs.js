import { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import LogSearch from "./LogSearch";
import EventTimeline from "./EventTimeline";

export default function AppTabs() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div>
      {/* Tab Buttons */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setActiveTab("dashboard")}>Dashboard</button>
        <button onClick={() => setActiveTab("logsearch")}>Log Search</button>
        <button onClick={() => setActiveTab("timeline")}>Event Timeline</button>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && <DashboardLayout />}
      {activeTab === "logsearch" && <LogSearch />}
      {activeTab === "timeline" && <EventTimeline />}
    </div>
  );
}
