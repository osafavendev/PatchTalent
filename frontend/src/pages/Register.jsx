import { useState } from "react";
import { BaseAPI, setTokens } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    is_hr: false,
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await BaseAPI.post("register/", form);
      setTokens(res.data.access, res.data.refresh);
      navigate("/");
    } catch (err) {
      const errorMessage =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        "Registration failed. Please check your details.";
      setError(errorMessage);
    }
  };

  return (
    <div className="app-shell page-enter relative flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute -left-16 bottom-12 h-44 w-44 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-14 top-10 h-40 w-40 rounded-full bg-indigo-300/20 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="clean-card relative w-full max-w-md overflow-hidden p-8"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700">
          <span className="glass-dot" />
          Get Started
        </div>
        <h1 className="clean-title text-center">Create account</h1>
        <p className="clean-subtitle mt-1 text-center">
          Start using PatchTalent
        </p>

        {error && <div className="alert-error mt-5">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Username
            </label>
            <input
              name="username"
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              className="input-clean"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
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
                value={form.password}
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

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirm_password"
                placeholder="Confirm Password"
                value={form.confirm_password}
                onChange={handleChange}
                required
                className="input-clean pr-16"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-indigo-600"
              >
                {showConfirm ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_hr"
              checked={form.is_hr}
              onChange={handleChange}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Register as HR
          </label>

          <button type="submit" className="btn-primary smooth-press mt-2 w-full">
            Register
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="smooth-press font-semibold text-indigo-600 hover:underline"
          >
            Log in
          </button>
        </p>
      </motion.div>
    </div>
  );
}