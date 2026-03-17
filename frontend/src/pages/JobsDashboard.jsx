import { useState, useEffect } from "react";
import JobsAPI from "../api/jobs";
import JobForm from "./JobForm";
import { FaMapMarkerAlt, FaBriefcase, FaSearch, FaPlus } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { logout } from "../api/auth";
import { jwtDecode } from "jwt-decode";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const getIsHR = () => {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    const payload = jwtDecode(token);
    return payload?.is_hr === true;
  } catch {
    return false;
  }
};

const buildNotificationsWebSocketUrl = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return "";

  let host = "";
  let protocol = "ws:";
  try {
    const parsed = new URL(API_BASE || window.location.origin);
    host = parsed.host;
    protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  } catch {
    host = window.location.host;
    protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  }
  return `${protocol}//${host}/ws/notifications/?token=${encodeURIComponent(token)}`;
};
const JOBS_PAGE_SIZE = 6;
const JOB_TYPE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

const formatJobTypeLabel = (jobType) => {
  if (!jobType) return "";
  if (jobType.toLowerCase() === "onsite") return "On-site";
  return jobType.charAt(0).toUpperCase() + jobType.slice(1);
};

const getJobTypeBadgeClasses = (jobType) => {
  switch ((jobType || "").toLowerCase()) {
    case "remote":
      return "bg-violet-100 text-violet-700";
    case "hybrid":
      return "bg-amber-100 text-amber-700";
    case "onsite":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getLocationBadgeClasses = (jobType) => {
  if ((jobType || "").toLowerCase() === "remote") {
    return "bg-fuchsia-100 text-fuchsia-700";
  }
  return "bg-emerald-100 text-emerald-700";
};

const getMatchBadgeClasses = (score) => {
  if (score >= 0.75) return "bg-emerald-100 text-emerald-700";
  if (score >= 0.5) return "bg-indigo-100 text-indigo-700";
  return "bg-orange-100 text-orange-700";
};

export default function JobsDashboard() {
  const navigate = useNavigate();
  const isHR = getIsHR();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingJob, setEditingJob] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [unreadDmCount, setUnreadDmCount] = useState(0);
  const [matchScores, setMatchScores] = useState({});
  const [matchingJobs, setMatchingJobs] = useState({});

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("all");

  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await JobsAPI.get("", {
        params: {
          page,
          role: roleFilter.trim() || undefined,
          location: locationFilter.trim() || undefined,
          job_type: jobTypeFilter !== "all" ? jobTypeFilter : undefined,
        },
      });
      const fetchedJobs = res?.data?.results || [];
      setJobs(fetchedJobs);
      if (!isHR) {
        const loadedJobIds = new Set(fetchedJobs.map((job) => job.id));
        const persistedScores = {};
        fetchedJobs.forEach((job) => {
          if (typeof job.match_score === "number") {
            persistedScores[job.id] = job.match_score;
          }
        });
        setMatchScores((prev) => {
          const next = { ...prev };
          loadedJobIds.forEach((jobId) => {
            delete next[jobId];
          });
          return { ...next, ...persistedScores };
        });
      }
      const totalCount = res?.data?.count || 0;
      const calculatedTotalPages = Math.max(
        1,
        Math.ceil(totalCount / JOBS_PAGE_SIZE)
      );
      setTotalPages(calculatedTotalPages);

      if (page > calculatedTotalPages) {
        setPage(calculatedTotalPages);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || "Failed to fetch jobs.";
      if (
        typeof detail === "string" &&
        detail.toLowerCase().includes("invalid page") &&
        page !== 1
      ) {
        setPage(1);
        return;
      }
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, roleFilter, locationFilter, jobTypeFilter]);

  useEffect(() => {
    const wsUrl = buildNotificationsWebSocketUrl();
    if (!wsUrl) return;
    const socket = new WebSocket(wsUrl);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload?.type === "unread_summary" ||
          payload?.type === "conversation_update"
        ) {
          setUnreadDmCount(Number(payload?.total_unread || 0));
        }
      } catch {
        // ignore malformed websocket payloads
      }
    };
    socket.onerror = () => {
      // keep last unread value if socket is unavailable
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleDelete = async (id) => {
    try {
      await JobsAPI.delete(`${id}/`);
      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed to delete job.");
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  const openCreateJobForm = () => {
    if (!isHR) {
      setError("Only HR users can create jobs. Log in with an HR account.");
      return;
    }
    setEditingJob(null);
    setShowForm(true);
  };

  const clearFilters = () => {
    setRoleFilter("");
    setLocationFilter("");
    setJobTypeFilter("all");
    setPage(1);
  };

  const handleMatchJob = async (jobId) => {
    setError("");
    setMatchingJobs((prev) => ({ ...prev, [jobId]: true }));
    try {
      const response = await JobsAPI.get(`${jobId}/match/`);
      setMatchScores((prev) => ({
        ...prev,
        [jobId]: Number(response?.data?.match_score || 0),
      }));
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to calculate match score.");
    } finally {
      setMatchingJobs((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  return (
    <div className="app-shell page-enter relative">
      <div className="pointer-events-none absolute -left-16 top-20 h-48 w-48 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-36 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="app-container max-w-7xl">

        {/* Header */}
        <div className="clean-card mb-8 flex flex-col gap-6 border-white/70 bg-white/80 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
              <span className="glass-dot" />
              Talent Intelligence
            </div>
            <h1 className="clean-title text-3xl">
              PatchTalent
            </h1>
            <p className="clean-subtitle mt-1">
              Discover and manage opportunities
            </p>
            {!isHR && (
              <p className="mt-2 text-xs font-medium text-indigo-600">
                Click “Match this job” to calculate CV fit only for that role.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">

            {isHR && (
              <button
                onClick={openCreateJobForm}
                className="btn-primary smooth-press whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-2">
                  <FaPlus />
                  Create Job
                </span>
              </button>
            )}
            <button
              onClick={() => navigate("/profile")}
              className="btn-secondary smooth-press whitespace-nowrap"
            >
              My Profile
            </button>
            <button
              onClick={() => navigate("/chat")}
              className="btn-secondary smooth-press inline-flex items-center gap-2 whitespace-nowrap"
            >
              Chat
              {unreadDmCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                  {unreadDmCount}
                </span>
              )}
            </button>
            <button
              onClick={logout}
              className="btn-danger smooth-press whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="clean-card mb-6 border-white/70 bg-white/80 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Search
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Role, title, or keyword (e.g. backend, remote)"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    if (page !== 1) setPage(1);
                  }}
                  className="input-clean py-2 pl-10 pr-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Location
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="City, country, or remote"
                  value={locationFilter}
                  onChange={(e) => {
                    setLocationFilter(e.target.value);
                    if (page !== 1) setPage(1);
                  }}
                  className="input-clean py-2 pl-10 pr-3"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Work mode
              </span>
              {JOB_TYPE_OPTIONS.map((option) => {
                const isActive = jobTypeFilter === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setJobTypeFilter(option.value);
                      if (page !== 1) setPage(1);
                    }}
                    className={`smooth-press rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200/80"
                        : "border border-slate-300/80 bg-white/90 text-slate-700 hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={clearFilters}
              className="smooth-press self-start rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 sm:self-auto"
            >
              Clear filters
            </button>
          </div>
        </div>
        {/* Error */}
        {error && <div className="alert-error mb-6">{error}</div>}

        {/* Loading */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="clean-card py-20 text-center text-xl text-gray-500">
            No jobs found.
            {isHR && (
              <div className="mt-6">
                <button
                  onClick={openCreateJobForm}
                  className="btn-primary smooth-press px-6 py-3 text-base"
                >
                  <span className="inline-flex items-center gap-2">
                    <FaPlus />
                    Create your first job
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job, index) => {
                const isExpanded = expandedJobId === job.id;
                const locationLabel =
                  job.job_location || (job.job_type?.toLowerCase() === "remote" ? "Remote" : "");

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    whileHover={{ y: -8, scale: 1.01 }}
                    whileTap={{ scale: 0.995 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(index * 0.05, 0.35),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="clean-card flex flex-col justify-between border-white/70 bg-white/80 p-5 transition hover:shadow-xl"
                  >
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {job.title}
                      </h2>
                      {!isHR && job.created_by_username && (
                        <p className="mt-1 text-xs text-gray-500">
                          Posted by HR:{" "}
                          <span className="font-semibold text-gray-700">
                            {job.created_by_username}
                          </span>
                        </p>
                      )}

                      <AnimatePresence initial={false}>
                        <motion.div
                          key={isExpanded ? "expanded" : "collapsed"}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 text-gray-600 text-sm leading-relaxed overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: isExpanded ? "none" : 4,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {job.description}
                          </ReactMarkdown>
                        </motion.div>
                      </AnimatePresence>

                      <button
                        onClick={() =>
                          setExpandedJobId(isExpanded ? null : job.id)
                        }
                        className="smooth-press mt-2 text-sm text-indigo-600 font-medium hover:underline"
                      >
                        {isExpanded ? "Show Less" : "Show More"}
                      </button>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        {job.job_type && (
                          <div
                            className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${getJobTypeBadgeClasses(job.job_type)}`}
                          >
                            <FaBriefcase />
                            {formatJobTypeLabel(job.job_type)}
                          </div>
                        )}
                        {locationLabel && (
                          <div
                            className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${getLocationBadgeClasses(job.job_type)}`}
                          >
                            <FaMapMarkerAlt />
                            {locationLabel}
                          </div>
                        )}
                        {!isHR && job.has_applied && (
                          <div className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full text-green-700 font-semibold">
                            Applied
                          </div>
                        )}
                        {!isHR && typeof matchScores[job.id] === "number" && (
                          <div
                            className={`flex items-center gap-1 rounded-full px-3 py-1 font-semibold ${getMatchBadgeClasses(matchScores[job.id])}`}
                          >
                            Match {Math.round(matchScores[job.id] * 100)}%
                          </div>
                        )}
                      </div>
                    </div>

                    {isHR && (
                      <div className="mt-5 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingJob(job);
                            setShowForm(true);
                          }}
                          className="smooth-press rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="smooth-press rounded-lg bg-rose-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="smooth-press mt-4 text-left text-sm font-semibold text-indigo-600 hover:underline"
                    >
                      View Details →
                    </button>
                    {!isHR && job.created_by_id && (
                      <button
                        onClick={() => navigate(`/chat?userId=${job.created_by_id}`)}
                        className="smooth-press mt-2 text-left text-sm font-semibold text-indigo-600 hover:underline"
                      >
                        Chat with HR
                      </button>
                    )}
                    {!isHR && (
                      <button
                        onClick={() => handleMatchJob(job.id)}
                        disabled={!!matchingJobs[job.id]}
                        className={`smooth-press mt-2 text-left text-sm font-semibold transition ${
                          matchingJobs[job.id]
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-violet-700 hover:underline"
                        }`}
                      >
                        {matchingJobs[job.id] ? "Calculating match..." : "Match this job"}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-10 flex justify-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="btn-secondary smooth-press px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`smooth-press px-4 py-2 rounded-lg text-sm font-medium transition ${
                    page === i + 1
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="btn-secondary smooth-press px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <JobForm
          job={editingJob}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            fetchJobs();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}