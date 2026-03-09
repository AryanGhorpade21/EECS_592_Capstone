export default function LogSearch() {
  return (
    <div>
      <h1>Log Search</h1>

      <div style={{ marginTop: "20px" }}>
        <h3>Filters</h3>

        <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
          <input placeholder="Source IP" />
          <input placeholder="Destination IP" />
          <select>
            <option>Protocol</option>
            <option>TCP</option>
            <option>UDP</option>
            <option>ICMP</option>
          </select>
          <select>
            <option>Alert Type</option>
            <option>Port Scan</option>
            <option>SSH Brute Force</option>
            <option>Other Filler Alert Types</option>
          </select>
          <input type="datetime-local" />
        </div>

        <button>Search Logs</button>
      </div>

      <div style={{ marginTop: "30px" }}>
        <h3>Results</h3>
        <p>(Log results will appear here once implemented.)</p>
      </div>
    </div>
  );
}
