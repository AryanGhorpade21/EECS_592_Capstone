import React, { useState, useEffect } from "react";
import axios from "axios";
import LogCard from "./LogCard";

export default function LogSearch() {
  const [filters, setFilters] = useState({
    src_ip: "",
    dst_ip: "",
    protocol: "",
    src_port: "",
    dst_port: "",
    start: "",
    end: ""
  });

  const [logs, setLogs] = useState([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const toISO = (value) => {
    if (!value) return "";
    return new Date(value).toISOString();
  };

  // Load ALL logs on mount
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const response = await axios.get(
          "https://gfxxlediud.execute-api.us-east-2.amazonaws.com/prod/logs/search"
        );
        setLogs(response.data.logs || []);
      } catch (err) {
        console.error("Error loading all logs:", err);
      }
    };

    fetchAll();
  }, []);

  // Client-side filtering
  const filteredLogs = logs.filter((log) => {
    if (filters.src_ip && log.src_ip !== filters.src_ip) return false;
    if (filters.dst_ip && log.dst_ip !== filters.dst_ip) return false;
    if (filters.protocol && log.protocol !== filters.protocol) return false;

    if (filters.src_port && String(log.src_port) !== filters.src_port) return false;
    if (filters.dst_port && String(log.dst_port) !== filters.dst_port) return false;

    if (filters.start) {
      const startISO = toISO(filters.start);
      if (log.sk < startISO) return false;
    }

    if (filters.end) {
      const endISO = toISO(filters.end);
      if (log.sk > endISO) return false;
    }

    return true;
  });

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Paginated slice
  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Log Search</h2>

      {/* Search Form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        <input
          type="text"
          placeholder="Source IP"
          value={filters.src_ip}
          onChange={(e) =>
            setFilters({ ...filters, src_ip: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Destination IP"
          value={filters.dst_ip}
          onChange={(e) =>
            setFilters({ ...filters, dst_ip: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Protocol"
          value={filters.protocol}
          onChange={(e) =>
            setFilters({ ...filters, protocol: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Source Port"
          value={filters.src_port}
          onChange={(e) =>
            setFilters({ ...filters, src_port: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Destination Port"
          value={filters.dst_port}
          onChange={(e) =>
            setFilters({ ...filters, dst_port: e.target.value })
          }
        />

        <input
          type="datetime-local"
          value={filters.start}
          onChange={(e) =>
            setFilters({ ...filters, start: e.target.value })
          }
        />

        <input
          type="datetime-local"
          value={filters.end}
          onChange={(e) =>
            setFilters({ ...filters, end: e.target.value })
          }
        />
      </div>

      <hr style={{ margin: "20px 0" }} />

      {/* Results */}
      {paginatedLogs.length === 0 && (
        <p>No logs match the selected filters.</p>
      )}

      {paginatedLogs.map((log, index) => (
        <LogCard key={index} log={log} />
      ))}

      {/* Pagination Controls */}
      {filteredLogs.length > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "20px"
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
