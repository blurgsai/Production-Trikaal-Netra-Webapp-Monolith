import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let logoutFunction: (() => void) | null = null;

export const setLogoutFunction = (logoutFn: () => void) => {
  logoutFunction = logoutFn;
};

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorStatus = error?.response?.status || null;
    if (errorStatus === 401) {
      if (logoutFunction) logoutFunction();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
