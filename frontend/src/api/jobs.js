import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL;


// BaseAPI without interceptors, used for refresh requests
const BaseAPI = axios.create({
  baseURL: API_BASE,
});

// JobsAPI (protected)
const JobsAPI = axios.create({
  baseURL: `${API_BASE}jobs/`,
});

// Attach access token to requests
JobsAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh token on 401
JobsAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only refresh once and skip refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("auth/token/refresh/")
    ) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh_token");

      if (!refresh) {
        // No refresh token → log out
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        // Use BaseAPI to avoid recursion and attach expired token
        const res = await BaseAPI.post("auth/token/refresh/", { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("access_token", newAccess);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return JobsAPI(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default JobsAPI;