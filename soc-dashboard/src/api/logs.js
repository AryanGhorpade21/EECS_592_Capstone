import { api } from "./client";

export const searchLogs = (filters) =>
  api.get("/logs/search", { params: filters }).then(res => res.data);

