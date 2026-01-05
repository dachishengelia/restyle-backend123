import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:3000",
  withCredentials: true,
});

console.log("Axios Base URL:", import.meta.env.VITE_API_BASE || "http://localhost:3000");

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Axios Error during log-in/log-out:", error.response || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;