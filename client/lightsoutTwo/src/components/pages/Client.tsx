import axios, { AxiosInstance, AxiosResponse } from "axios";

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

// Create a typed wrapper around Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: "http://localhost:8000/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for consistent typing
apiClient.interceptors.response.use(
  <T,>(response: AxiosResponse<T>): AxiosResponse<T> => ({
    ...response,
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config: response.config,
  }),
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
