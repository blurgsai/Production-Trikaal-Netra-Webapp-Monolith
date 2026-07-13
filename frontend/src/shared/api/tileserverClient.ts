import axios from "axios";

const tileserverInstance = axios.create({
  baseURL: import.meta.env.VITE_TILESERVER_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

tileserverInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default tileserverInstance;
