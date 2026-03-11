import React, { useState } from "react";

export default function LogCard({ log }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px",
        background: "#fafafa"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{log.alert_type || "Packet"}</strong>
        <button onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Details"}
        </button>
      </div>

      <div><strong>Timestamp:</strong> {log.sk}</div>
      <div><strong>Source IP:</strong> {log.src_ip}</div>
      <div><strong>Source Port:</strong> {log.src_port}</div>
      <div><strong>Destination IP:</strong> {log.dst_ip}</div>
      <div><strong>Destination Port:</strong> {log.dst_port}</div>
      <div><strong>Protocol:</strong> {log.protocol}</div>

      {open && (
        <pre
          style={{
            marginTop: "10px",
            background: "#eee",
            padding: "10px",
            borderRadius: "6px"
          }}
        >
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </div>
  );
}

