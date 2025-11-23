import axios from "axios";

// env default value fallback handle
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
