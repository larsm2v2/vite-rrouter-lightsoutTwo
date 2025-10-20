const PROD = Boolean(import.meta.env.PROD);

export const API_URL = PROD
  ? "/api" // same-origin proxy via Firebase Hosting
  : import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export default API_URL;
