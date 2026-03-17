import { useEffect, useState } from "react";
import API, { clearTokens, refreshToken } from "../api/auth";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await API.get("check-auth/");
        setUser(res.data);
      } catch (err) {
        const newAccess = await refreshToken();
        if (newAccess) {
          checkAuth(); // retry after refreshing token
        } else {
          navigate("/login");
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  if (!user) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="clean-card px-6 py-5 text-sm font-medium text-slate-600">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell page-enter px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="clean-card border-white/70 bg-white/80 p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
            <span className="glass-dot" />
            Session
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome, {user.username}</h2>
          <p className="mt-2 text-sm text-slate-600">Email: {user.email}</p>
          <p className="mt-1 text-sm text-slate-600">
            Authenticated: {user.authenticated ? "Yes" : "No"}
          </p>
          <button onClick={handleLogout} className="btn-danger smooth-press mt-4">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
