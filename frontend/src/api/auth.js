import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL;


const BaseAPI = axios.create({
  baseURL: `${API_BASE}auth/`,
});

const AuthAPI = axios.create({
  baseURL: API_BASE,
});

const notifyAuthChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth-changed"));
  }
};

AuthAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

AuthAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("token/refresh/")
    ) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) {
        logout();
        return Promise.reject(error);
      }
      try {
        const res = await BaseAPI.post("token/refresh/", { refresh });
        const newAccess = res.data.access;
        localStorage.setItem("access_token", newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return AuthAPI(originalRequest);
      } catch (err) {
        logout();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export const setTokens = (access, refresh) => {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  notifyAuthChanged();
};

export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  notifyAuthChanged();
};

export const logout = () => {
  clearTokens();
  window.location.href = "/login";
};

export default AuthAPI;
export { BaseAPI };