// src/api/client.js
import axios from "axios";

export const api = axios.create({
  baseURL: "https://gfxxlediud.execute-api.us-east-2.amazonaws.com",
});

