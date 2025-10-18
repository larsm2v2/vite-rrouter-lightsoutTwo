const PROD = import.meta.env.PROD;

const API_URL = PROD
  ? "/api" // same-origin proxy via Firebase Hosting
  : import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export { API_URL };
