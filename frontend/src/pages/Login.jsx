import { useState } from "react";
import { BaseAPI, setTokens } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await BaseAPI.post("login/", form);
      setTokens(res.data.access, res.data.refresh);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password");
    }
  };

  return (
    <div className="app-shell page-enter relative flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -left-14 top-12 h-40 w-40 rounded-full bg-indigo-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-10 h-44 w-44 rounded-full bg-fuchsia-300/25 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="clean-card relative w-full max-w-md overflow-hidden p-8"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
          <span className="glass-dot" />
          Secure Access
        </div>
        <h1 className="clean-title text-center">Welcome back</h1>
        <p className="clean-subtitle mt-1 text-center">
          Sign in to continue
        </p>

        {error && <div className="alert-error mt-5">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
          <input
            name="email"
            type="email"
            placeholder="Email address"
            onChange={handleChange}
            required
            className="input-clean"
          />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Password
            </label>
            <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              onChange={handleChange}
              required
              className="input-clean pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-indigo-600"
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
            </div>
          </div>
          <button type="submit" className="btn-primary smooth-press mt-2 w-full">
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don’t have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="smooth-press font-semibold text-indigo-600 hover:underline"
          >
            Create one
          </button>
        </p>
      </motion.div>
    </div>
  );
}
