// src/api/alerts.js
import { api } from "./client";

export const fetchRecentAlerts = () =>
  api.get("/alerts/recent").then(res => res.data);

export const fetchSeverityMetrics = () =>
  api.get("/metrics/severity").then(res => res.data);

export const fetchRuleMetrics = () =>
  api.get("/metrics/rules").then(res => res.data);

export const fetchSystemStatus = () =>
  api.get("/system/status").then(res => res.data);

