import { useState, useRef, useEffect } from "react";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = "monitoring-pcap-storage";
const S3_PREFIX = "alerts/";
const AWS_REGION = "us-east-2";

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
  },
});

const SEVERITY_COLORS = {
  critical: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595", dot: "#E24B4A" },
  HIGH:     { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595", dot: "#E24B4A" },
  MEDIUM:   { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27", dot: "#EF9F27" },
  LOW:      { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459", dot: "#639922" },
  INFO:     { bg: "#E6F1FB", text: "#185FA5", border: "#85B7EB", dot: "#378ADD" },
};

const PROTOCOL_COLORS = {
  tcp: "#378ADD", icmp: "#D85A30", udp: "#1D9E75", other: "#888780",
};

const IP_LINE_COLORS = [
  "#7F77DD", "#1D9E75", "#D85A30", "#378ADD", "#D4537E", "#BA7517", "#639922",
];

const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const formatDate = (ts) => new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
const GROUP_OPTIONS = ["none", "src_ip", "protocol", "severity", "rule"];

function downloadCSV(events) {
  const headers = ["timestamp","rule","severity","src_ip","dst_ip","dst_port","description","annotation","resolved"];
  const rows = events.map(e => headers.map(h => JSON.stringify(e[h] ?? "")).join(","));
  const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "timeline_export.csv"; a.click();
  URL.revokeObjectURL(url);
}

function copySummary(events, annotations, resolved) {
  if (!events.length) return;
  const lines = [
    `INCIDENT SUMMARY — ${new Date().toLocaleString()}`,
    `Total pinned events: ${events.length}`,
    `CRITICAL/HIGH: ${events.filter(e => ["critical","HIGH"].includes(e.severity)).length}  MEDIUM: ${events.filter(e => e.severity === "MEDIUM").length}  LOW: ${events.filter(e => e.severity === "LOW").length}`,
    "",
    "EVENTS:",
    ...events.map((e, i) => {
      const note = annotations[e.id] ? ` | Note: ${annotations[e.id]}` : "";
      const res = resolved[e.id] ? " [RESOLVED]" : "";
      return `${i+1}. [${e.severity}] ${e.rule} — ${e.src_ip} → ${e.dst_ip}${e.dst_port ? `:${e.dst_port}` : ""} at ${formatTime(e.timestamp)}${note}${res}`;
    }),
  ];
  navigator.clipboard.writeText(lines.join("\n"));
}

async function fetchAlertsFromS3() {
  const listed = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: S3_PREFIX }));
  const objects = (listed.Contents || []).filter(o => o.Size > 0 && o.Key.endsWith(".json"));
  const alerts = await Promise.all(objects.map(async (obj, i) => {
    const res = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: obj.Key }));
    const text = await res.Body.transformToString();
    const data = JSON.parse(text);
    return {
      id: String(i + 1),
      timestamp: data.timestamp,
      rule: data.rule,
      severity: data.severity,
      src_ip: data.src_ip,
      dst_ip: data.dst_ip,
      dst_port: data.dst_port ? String(data.dst_port) : null,
      protocol: data.protocol || "tcp",
      description: data.description || "",
    };
  }));
  return alerts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export default function EventTimeline() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [pinned, setPinned] = useState({});
  const [annotations, setAnnotations] = useState({});
  const [resolved, setResolved] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [draftNote, setDraftNote] = useState("");
  const [groupBy, setGroupBy] = useState("none");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchAlertsFromS3()
      .then(data => { setAlerts(data); setLoading(false); setLastRefresh(new Date()); })
      .catch(err => { setError(err.message); setLoading(false); });

    const interval = setInterval(() => {
      fetchAlertsFromS3()
        .then(data => { setAlerts(data); setLastRefresh(new Date()); })
        .catch(err => console.error("Auto-refresh error:", err));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (editingId) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editingId]);

  const togglePin = (id) => { setPinned(p => ({ ...p, [id]: !p[id] })); if (pinned[id]) setSelectedId(null); };
  const pinAllHigh = () => { const ids = alerts.filter(a => ["critical","HIGH"].includes(a.severity)).reduce((acc, a) => ({ ...acc, [a.id]: true }), {}); setPinned(p => ({ ...p, ...ids })); };
  const clearTimeline = () => { setPinned({}); setSelectedId(null); setAnnotations({}); setResolved({}); };

  const pinnedAlerts = alerts.filter(a => pinned[a.id]).map(a => ({ ...a, annotation: annotations[a.id] || "" }));
  const filtered = filterSeverity === "ALL" ? pinnedAlerts : pinnedAlerts.filter(a => a.severity === filterSeverity);
  const sorted = [...filtered].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const grouped = {};
  if (groupBy === "none") { grouped["All Events"] = sorted; }
  else { sorted.forEach(a => { const k = a[groupBy] || "unknown"; if (!grouped[k]) grouped[k] = []; grouped[k].push(a); }); }

  const minTs = sorted.length ? new Date(sorted[0].timestamp).getTime() : 0;
  const maxTs = sorted.length ? new Date(sorted[sorted.length - 1].timestamp).getTime() : 1;
  const range = maxTs - minTs || 1;
  const pct = (ts) => ((new Date(ts).getTime() - minTs) / range) * 88 + 6;
  const saveNote = (id) => { setAnnotations(n => ({ ...n, [id]: draftNote })); setEditingId(null); };

  const ipColorMap = {};
  [...new Set(alerts.map(a => a.src_ip))].forEach((ip, i) => { ipColorMap[ip] = IP_LINE_COLORS[i % IP_LINE_COLORS.length]; });
  const ipAlertCount = {};
  alerts.forEach(a => { ipAlertCount[a.src_ip] = (ipAlertCount[a.src_ip] || 0) + 1; });

  const filteredLog = alerts.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.src_ip.includes(q) || a.dst_ip.includes(q) || a.rule.toLowerCase().includes(q) || (a.dst_port && a.dst_port.includes(q)) || a.severity.toLowerCase().includes(q) || (a.protocol && a.protocol.toLowerCase().includes(q));
  });

  const pinnedCount = Object.values(pinned).filter(Boolean).length;
  const critHighCount = sorted.filter(e => ["critical","HIGH"].includes(e.severity)).length;
  const medCount = sorted.filter(e => e.severity === "MEDIUM").length;
  const lowCount = sorted.filter(e => e.severity === "LOW").length;
  const handleCopySummary = () => { copySummary(sorted, annotations, resolved); setCopiedMsg(true); setTimeout(() => setCopiedMsg(false), 2000); };

  if (loading) return <div style={{ padding: "2rem", fontSize: 14, color: "#666" }}>Loading alerts from S3...</div>;
  if (error) return <div style={{ padding: "2rem", fontSize: 14, color: "#A32D2D" }}>Error loading alerts: {error}</div>;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: 1100, margin: "0 auto", color: "#1a1a1a" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Investigation timeline</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
            {pinnedCount} pinned · {alerts.length} total alerts from S3
            {lastRefresh && <span style={{ marginLeft: 8, color: "#aaa" }}>· last updated {formatTime(lastRefresh)}</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select style={{ fontSize: 13, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
            {GROUP_OPTIONS.map(o => <option key={o} value={o}>Group: {o}</option>)}
          </select>
          <select style={{ fontSize: 13, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }} value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            {["ALL","critical","HIGH","MEDIUM","LOW","INFO"].map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={pinAllHigh} style={{ fontSize: 13, padding: "6px 12px", border: "1px solid #F09595", borderRadius: 6, background: "#FCEBEB", color: "#A32D2D", cursor: "pointer" }}>Pin all critical</button>
          <button onClick={clearTimeline} style={{ fontSize: 13, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Clear timeline</button>
          <button onClick={() => downloadCSV(pinnedAlerts)} style={{ fontSize: 13, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer" }}>Export CSV</button>
          <button onClick={handleCopySummary} style={{ fontSize: 13, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, background: copiedMsg ? "#EAF3DE" : "#fff", color: copiedMsg ? "#3B6D11" : "#1a1a1a", cursor: "pointer" }}>{copiedMsg ? "Copied!" : "Copy summary"}</button>
        </div>
      </div>

      {pinnedCount > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem" }}>
          {[["CRITICAL/HIGH","#FCEBEB","#A32D2D","#F09595",critHighCount],["MEDIUM","#FAEEDA","#854F0B","#EF9F27",medCount],["LOW","#EAF3DE","#3B6D11","#97C459",lowCount]].map(([sev,bg,text,border,count]) => (
            <div key={sev} style={{ padding: "8px 16px", background: bg, border: `1px solid ${border}`, borderRadius: 8, fontSize: 13 }}>
              <span style={{ color: text, fontWeight: 500 }}>{sev}</span>
              <span style={{ color: text, marginLeft: 8, fontSize: 18, fontWeight: 500 }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#f9f9f9", border: "1px solid #e5e5e5", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem", minHeight: 120, position: "relative" }}>
        {sorted.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#aaa", textAlign: "center", paddingTop: 32 }}>Pin events from the alert log below to build your timeline</p>
        ) : (
          Object.entries(grouped).map(([groupKey, events]) => (
            <div key={groupKey} style={{ marginBottom: groupBy !== "none" ? 28 : 0 }}>
              {groupBy !== "none" && <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{groupKey}</p>}
              <div style={{ position: "relative", marginBottom: 32 }}>
                <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 6, overflow: "visible" }}>
                  <rect x="0" y="0" width="100%" height="6" rx="3" fill="#e0e0e0" />
                  {(() => {
                    const byIp = {};
                    events.forEach(ev => { if (!byIp[ev.src_ip]) byIp[ev.src_ip] = []; byIp[ev.src_ip].push(ev); });
                    return Object.entries(byIp).map(([ip, ipEvents]) => {
                      if (ipEvents.length < 2) return null;
                      const color = ipColorMap[ip];
                      const pts = ipEvents.map(e => pct(e.timestamp));
                      return pts.slice(1).map((p, i) => (
                        <line key={`${ip}-${i}`} x1={`${pts[i]}%`} y1="3" x2={`${p}%`} y2="3" stroke={color} strokeWidth="2.5" strokeDasharray="4 3" opacity="0.7" />
                      ));
                    });
                  })()}
                </svg>
                <div style={{ position: "relative", height: 6 }}>
                  {events.map((ev, i) => {
                    const col = SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.INFO;
                    const pos = pct(ev.timestamp);
                    const prevPos = i > 0 ? pct(events[i-1].timestamp) : -999;
                    return (
                      <div key={ev.id}>
                        <div onClick={() => setSelectedId(selectedId === ev.id ? null : ev.id)}
                          onMouseEnter={(e) => setTooltip({ id: ev.id, x: e.clientX, y: e.clientY, ev })}
                          onMouseLeave={() => setTooltip(null)}
                          style={{ position: "absolute", left: `${pos}%`, top: "50%", transform: "translate(-50%, -50%)", width: selectedId === ev.id ? 16 : 12, height: selectedId === ev.id ? 16 : 12, borderRadius: "50%", background: col.dot, border: "2px solid #fff", boxShadow: `0 0 0 2px ${col.border}`, cursor: "pointer", transition: "width 0.15s, height 0.15s", zIndex: 3 }} />
                        {Math.abs(pos - prevPos) >= 8 && (
                          <span style={{ position: "absolute", left: `${pos}%`, top: 14, transform: "translateX(-50%)", fontSize: 10, color: "#aaa", whiteSpace: "nowrap", zIndex: 1 }}>{formatTime(ev.timestamp)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {selectedId && events.find(e => e.id === selectedId) && (() => {
                const ev = events.find(e => e.id === selectedId);
                const col = SEVERITY_COLORS[ev.severity] || SEVERITY_COLORS.INFO;
                const ipCount = ipAlertCount[ev.src_ip] || 0;
                return (
                  <div style={{ background: "#fff", border: `1px solid ${col.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 12, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 500 }}>{ev.rule}</span>
                        <span style={{ padding: "2px 8px", borderRadius: 5, background: col.bg, color: col.text, fontSize: 11, fontWeight: 500 }}>{ev.severity}</span>
                        {ipCount > 1 && <span style={{ padding: "2px 8px", borderRadius: 5, background: "#EAF3DE", color: "#3B6D11", fontSize: 11, fontWeight: 500 }}>{ipCount} alerts from this IP</span>}
                        {resolved[ev.id] && <span style={{ padding: "2px 8px", borderRadius: 5, background: "#E6F1FB", color: "#185FA5", fontSize: 11 }}>Resolved</span>}
                      </div>
                      <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>{formatDate(ev.timestamp)} {formatTime(ev.timestamp)}</span>
                    </div>
                    <div style={{ marginTop: 6, color: "#555" }}>
                      <span style={{ fontFamily: "monospace" }}>{ev.src_ip} → {ev.dst_ip}{ev.dst_port ? `:${ev.dst_port}` : ""}</span>
                      &nbsp;·&nbsp;<span style={{ color: PROTOCOL_COLORS[ev.protocol] || "#888" }}>{ev.protocol}</span>
                    </div>
                    <div style={{ marginTop: 4, color: "#888" }}>{ev.description}</div>
                    {editingId === ev.id ? (
                      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                        <input ref={inputRef} value={draftNote} onChange={e => setDraftNote(e.target.value)} onKeyDown={e => e.key === "Enter" && saveNote(ev.id)} placeholder="Add annotation..." style={{ flex: 1, fontSize: 13, padding: "4px 8px", border: "1px solid #ddd", borderRadius: 4 }} />
                        <button onClick={() => saveNote(ev.id)} style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ fontSize: 11, padding: "4px 10px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#888", fontStyle: annotations[ev.id] ? "normal" : "italic" }}>{annotations[ev.id] || "No annotation"}</span>
                        <button onClick={() => { setEditingId(ev.id); setDraftNote(annotations[ev.id] || ""); }} style={{ fontSize: 11, padding: "2px 8px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>{annotations[ev.id] ? "Edit" : "Annotate"}</button>
                        <button onClick={() => setResolved(r => ({ ...r, [ev.id]: !r[ev.id] }))} style={{ fontSize: 11, padding: "2px 8px", border: `1px solid ${resolved[ev.id] ? "#85B7EB" : "#ddd"}`, borderRadius: 4, background: resolved[ev.id] ? "#E6F1FB" : "#fff", color: resolved[ev.id] ? "#185FA5" : "#1a1a1a", cursor: "pointer" }}>{resolved[ev.id] ? "Unresolve" : "Mark resolved"}</button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))
        )}
      </div>

      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y - 40, background: "#1a1a1a", color: "#fff", fontSize: 12, padding: "6px 10px", borderRadius: 6, pointerEvents: "none", zIndex: 9999, whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 500 }}>{tooltip.ev.rule}</div>
          <div style={{ color: "#ccc", marginTop: 2 }}>{tooltip.ev.src_ip} · {formatTime(tooltip.ev.timestamp)}</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>Alert log ({filteredLog.length})</h3>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by IP, rule, port, protocol..." style={{ fontSize: 13, padding: "6px 12px", border: "1px solid #ddd", borderRadius: 6, width: 280 }} />
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden" }}>
        {filteredLog.length === 0 ? (
          <p style={{ margin: 0, padding: "20px", fontSize: 13, color: "#aaa", textAlign: "center" }}>No alerts match your search</p>
        ) : (
          filteredLog.map((alert, i) => {
            const col = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.INFO;
            const isPinned = !!pinned[alert.id];
            const isPreview = previewId === alert.id;
            const dupCount = ipAlertCount[alert.src_ip] || 0;
            return (
              <div key={alert.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderBottom: isPreview || i === filteredLog.length - 1 ? "none" : "1px solid #f0f0f0", background: isPinned ? "#fafafa" : "#fff", cursor: "pointer" }} onClick={() => setPreviewId(isPreview ? null : alert.id)}>
                  <button onClick={e => { e.stopPropagation(); togglePin(alert.id); }} title={isPinned ? "Remove from timeline" : "Pin to timeline"} style={{ background: isPinned ? col.bg : "transparent", border: `1px solid ${isPinned ? col.border : "#ddd"}`, borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: isPinned ? col.text : "#bbb" }}>
                    {isPinned ? "★" : "☆"}
                  </button>
                  <span style={{ padding: "2px 8px", borderRadius: 5, background: col.bg, color: col.text, fontSize: 11, fontWeight: 500, flexShrink: 0, minWidth: 54, textAlign: "center" }}>{alert.severity}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, minWidth: 140, flexShrink: 0 }}>{alert.rule}</span>
                  <span style={{ fontSize: 12, color: "#555", fontFamily: "monospace", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alert.src_ip} → {alert.dst_ip}{alert.dst_port ? `:${alert.dst_port}` : ""}</span>
                  {dupCount > 1 && <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "#FAEEDA", color: "#854F0B", flexShrink: 0, fontWeight: 500 }}>{dupCount} alerts</span>}
                  <span style={{ fontSize: 11, color: PROTOCOL_COLORS[alert.protocol] || "#888", fontWeight: 500, flexShrink: 0 }}>{alert.protocol?.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>{formatTime(alert.timestamp)}</span>
                </div>
                {isPreview && (
                  <div style={{ padding: "12px 16px 14px 54px", background: "#fafafa", borderBottom: i === filteredLog.length - 1 ? "none" : "1px solid #f0f0f0", fontSize: 13 }}>
                    <div style={{ color: "#555", marginBottom: 4 }}>
                      <span style={{ fontFamily: "monospace" }}>{alert.src_ip} → {alert.dst_ip}{alert.dst_port ? `:${alert.dst_port}` : ""}</span>
                      &nbsp;·&nbsp;<span style={{ color: PROTOCOL_COLORS[alert.protocol] || "#888" }}>{alert.protocol}</span>
                      &nbsp;·&nbsp;<span style={{ color: "#aaa" }}>{formatDate(alert.timestamp)} {formatTime(alert.timestamp)}</span>
                    </div>
                    <div style={{ color: "#888" }}>{alert.description}</div>
                    <button onClick={e => { e.stopPropagation(); togglePin(alert.id); }} style={{ marginTop: 8, fontSize: 12, padding: "4px 12px", border: `1px solid ${isPinned ? "#F09595" : "#ddd"}`, borderRadius: 5, background: isPinned ? "#FCEBEB" : "#fff", color: isPinned ? "#A32D2D" : "#1a1a1a", cursor: "pointer" }}>
                      {isPinned ? "Remove from timeline" : "Pin to timeline"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
