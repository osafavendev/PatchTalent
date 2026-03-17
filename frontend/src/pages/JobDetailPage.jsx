import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaMapMarkerAlt, FaBriefcase } from "react-icons/fa";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import JobsAPI from "../api/jobs";
import { jwtDecode } from "jwt-decode";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const MIN_COVER_LETTER_LENGTH = 30;
const MAX_COVER_LETTER_LENGTH = 4000;

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

const getAbsoluteFileUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const fallbackBase =
    API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    return new URL(url, fallbackBase).toString();
  } catch {
    return url;
  }
};

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const descRef = useRef(null);
  const isHR = getIsHR();

  const [job, setJob] = useState(null);
  const [status, setStatus] = useState("loading");
  const [expanded, setExpanded] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [initialCoverLetter, setInitialCoverLetter] = useState("");
  const [selectedCvFile, setSelectedCvFile] = useState(null);
  const [initialCvUrl, setInitialCvUrl] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyError, setApplyError] = useState("");
  const [coverLetterError, setCoverLetterError] = useState("");
  const [cvError, setCvError] = useState("");
  const [applicants, setApplicants] = useState([]);
  const [applicantsStatus, setApplicantsStatus] = useState("idle");
  const [applicantsError, setApplicantsError] = useState("");
  const [applicantsSortMode, setApplicantsSortMode] = useState("recent");
  const [expandedProposals, setExpandedProposals] = useState({});

  const getProposalPreview = (text) => {
    if (!text) return "";
    const lines = text.split(/\r?\n/);
    const previewLines = lines.slice(0, 3);
    const hasMore = lines.length > 3;
    return `${previewLines.join("\n")}${hasMore ? "\n..." : ""}`;
  };

  const hasMoreThanThreeLines = (text) => {
    if (!text) return false;
    return text.split(/\r?\n/).length > 3;
  };

  const toggleProposal = (applicationId) => {
    setExpandedProposals((prev) => ({
      ...prev,
      [applicationId]: !prev[applicationId],
    }));
  };

  const validateCoverLetter = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Cover letter is required.";
    if (trimmed.length < MIN_COVER_LETTER_LENGTH) {
      return `Cover letter must be at least ${MIN_COVER_LETTER_LENGTH} characters.`;
    }
    if (trimmed.length > MAX_COVER_LETTER_LENGTH) {
      return `Cover letter cannot exceed ${MAX_COVER_LETTER_LENGTH} characters.`;
    }
    return "";
  };

  const loadApplicants = async (sortMode = "recent") => {
    setApplicantsStatus("loading");
    setApplicantsError("");
    try {
      const params = sortMode === "proposal" ? { sort: "proposal" } : {};
      const applicantsRes = await JobsAPI.get(`${id}/applications/`, { params });
      setApplicants(applicantsRes.data || []);
      setApplicantsSortMode(sortMode);
      setApplicantsStatus("success");
    } catch (err) {
      setApplicantsStatus("error");
      setApplicantsError(
        err?.response?.data?.detail || "Failed to load applicants."
      );
    }
  };

  const handleSortApplicantsByProposal = () => {
    if (!isHR || applicantsStatus === "loading") return;
    loadApplicants("proposal");
  };

  const handleSortApplicantsByRecent = () => {
    if (!isHR || applicantsStatus === "loading") return;
    loadApplicants("recent");
  };

  useEffect(() => {
    JobsAPI.get(`${id}/`)
      .then(res => {
        setJob(res.data);
        const alreadyApplied = !!res.data?.has_applied;
        const existingCoverLetter = res.data?.user_cover_letter || "";
        const existingCv = res.data?.user_cv || "";
        setHasApplied(alreadyApplied);
        setCoverLetter(existingCoverLetter);
        setInitialCoverLetter(existingCoverLetter);
        setSelectedCvFile(null);
        setInitialCvUrl(existingCv);
        setStatus("success");

        if (isHR) {
          loadApplicants("recent");
        }
      })
      .catch(() => setStatus("error"));
  }, [id, isHR]);

  const handleApply = async () => {
    setApplyMessage("");
    setApplyError("");
    setCoverLetterError("");
    setCvError("");
    const validationError = validateCoverLetter(coverLetter);
    if (validationError) {
      setCoverLetterError(validationError);
      return;
    }
    setIsApplying(true);
    const trimmedCoverLetter = coverLetter.trim();
    const hasCoverLetterChanges = trimmedCoverLetter !== initialCoverLetter.trim();
    const hasCvChanges = !!selectedCvFile;
    const isCvRequired = !hasApplied || !initialCvUrl;

    if (isCvRequired && !selectedCvFile) {
      setCvError("CV is required.");
      setIsApplying(false);
      return;
    }

    if (hasApplied && !hasCoverLetterChanges && !hasCvChanges) {
      setApplyError("Please update your cover letter or upload a new CV before saving.");
      setIsApplying(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("cover_letter", trimmedCoverLetter);
      if (selectedCvFile) {
        formData.append("cv", selectedCvFile);
      }
      const requestPromise = hasApplied
        ? JobsAPI.put(`${id}/apply/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : JobsAPI.post(`${id}/apply/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
      const response = await requestPromise;
      setInitialCoverLetter(trimmedCoverLetter);
      setInitialCvUrl(response?.data?.cv || initialCvUrl);
      setSelectedCvFile(null);
      setHasApplied(true);
      setApplyMessage(
        hasApplied
          ? "Application updated successfully."
          : "Application submitted successfully."
      );
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.cover_letter?.[0] ||
        err?.response?.data?.cv?.[0] ||
        "Failed to apply for this job.";
      if (err?.response?.data?.cover_letter?.[0]) {
        setCoverLetterError(err.response.data.cover_letter[0]);
      } else if (err?.response?.data?.cv?.[0]) {
        setCvError(err.response.data.cv[0]);
      } else {
        setApplyError(detail);
      }
      if (String(detail).toLowerCase().includes("already applied")) {
        setHasApplied(true);
      }
    } finally {
      setIsApplying(false);
    }
  };

  if (status !== "success")
    return (
      <div className="app-shell flex items-center justify-center px-4">
        <div className="clean-card p-6 text-center text-base text-slate-700">
          {status === "loading" ? "Loading..." : "Failed to fetch job."}
        </div>
      </div>
    );

  const showFade =
    !expanded && descRef.current?.scrollHeight > 384;
  const trimmedCoverLetterLength = coverLetter.trim().length;
  const isFormInvalid = !!validateCoverLetter(coverLetter);
  const isCvMissing = (!hasApplied && !selectedCvFile) || (hasApplied && !initialCvUrl && !selectedCvFile);
  const hasUnsavedChanges =
    coverLetter.trim() !== initialCoverLetter.trim() || !!selectedCvFile;

  return (
    <div className="app-shell page-enter relative py-10">
      <div className="pointer-events-none absolute -left-14 top-20 h-44 w-44 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-40 h-48 w-48 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="mx-auto max-w-4xl px-4">

        <button
          onClick={() => navigate(-1)}
          className="smooth-press mb-6 text-sm font-semibold text-indigo-600 hover:underline"
        >
          ← Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="clean-card border-white/70 bg-white/80 p-6 sm:p-8"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
            <span className="glass-dot" />
            Opportunity Details
          </div>
          <h1 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
            {job.title}
          </h1>
          {!isHR && job.created_by_username && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-600">
                Posted by HR:{" "}
                <span className="font-semibold text-gray-800">
                  {job.created_by_username}
                </span>
              </p>
              {job.created_by_id && (
                <button
                  onClick={() => navigate(`/chat?userId=${job.created_by_id}`)}
                  className="btn-secondary smooth-press px-3 py-1.5 text-xs"
                >
                  Chat with HR
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-6">
            {job.job_type && (
              <Tag icon={<FaBriefcase />} text={job.job_type} />
            )}
            <Tag
              icon={<FaMapMarkerAlt />}
              text={job.job_location || "Remote"}
            />
          </div>

          <div className="mb-6 border-t border-slate-200" />

          <div className="relative">
            <div
              ref={descRef}
              className={`prose max-w-none transition-all duration-300 ${
                expanded ? "" : "max-h-96 overflow-hidden"
              }`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {job.description}
              </ReactMarkdown>
            </div>

            {showFade && (
              <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-white to-transparent" />
            )}
          </div>

          <button
            onClick={() => setExpanded(e => !e)}
            className="smooth-press mt-4 text-sm font-semibold text-indigo-600 hover:underline"
          >
            {expanded ? "Show Less" : "Read More"}
          </button>

          {isHR && (
            <div className="mt-8 rounded-2xl border border-white/70 bg-white/70 p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Applicants</h2>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSortApplicantsByProposal}
                  disabled={applicantsStatus === "loading" || applicantsSortMode === "proposal"}
                  className={`smooth-press rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    applicantsStatus === "loading" || applicantsSortMode === "proposal"
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Rank by best proposal
                </button>
                <button
                  onClick={handleSortApplicantsByRecent}
                  disabled={applicantsStatus === "loading" || applicantsSortMode === "recent"}
                  className={`smooth-press rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    applicantsStatus === "loading" || applicantsSortMode === "recent"
                      ? "cursor-not-allowed bg-slate-200 text-slate-500"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Newest first
                </button>
                <span className="text-xs text-gray-500">
                  {applicantsSortMode === "proposal"
                    ? "Showing highest-quality proposals first."
                    : "Showing latest applicants first."}
                </span>
              </div>

              {applicantsStatus === "loading" && (
                <div className="text-sm text-gray-500">Loading applicants...</div>
              )}

              {applicantsStatus === "error" && (
                <div className="alert-error">
                  {applicantsError}
                </div>
              )}

              {applicantsStatus === "success" && applicants.length === 0 && (
                <div className="clean-card-soft px-4 py-3 text-sm text-slate-600">
                  No applicants yet for this job.
                </div>
              )}

              {applicantsStatus === "success" && applicants.length > 0 && (
                <div className="space-y-4">
                  {applicants.map((application, index) => {
                    const isProposalExpanded = !!expandedProposals[application.id];
                    const canExpand = hasMoreThanThreeLines(application.cover_letter);

                    return (
                      <motion.div
                        key={application.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.28,
                          delay: Math.min(index * 0.04, 0.2),
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        whileHover={{ y: -2 }}
                        className="clean-card-soft border-white/70 bg-white/80 p-4 transition hover:shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <button
                            onClick={() => navigate(`/profile/candidates/${application.applicant_id}`)}
                            className="smooth-press text-base font-semibold text-indigo-700 hover:underline text-left"
                          >
                            {application.applicant_username}
                          </button>
                          <span className="text-xs text-gray-500">
                            Applied {new Date(application.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{application.applicant_email}</p>
                        {applicantsSortMode === "proposal" && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {typeof application.proposal_rank === "number" && (
                              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                                Rank #{application.proposal_rank}
                              </span>
                            )}
                            {typeof application.proposal_percentage === "number" && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                Proposal score {application.proposal_percentage}%
                              </span>
                            )}
                          </div>
                        )}
                        <div
                          className={`mt-3 rounded-xl border border-indigo-100/70 bg-white/70 px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap ${
                            isProposalExpanded ? "" : "overflow-hidden"
                          }`}
                          style={
                            isProposalExpanded
                              ? undefined
                              : {
                                  display: "-webkit-box",
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: "vertical",
                                }
                          }
                        >
                          {isProposalExpanded
                            ? application.cover_letter
                            : getProposalPreview(application.cover_letter)}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4">
                          {canExpand && (
                            <button
                              onClick={() => toggleProposal(application.id)}
                              className="smooth-press text-sm font-medium text-indigo-600 hover:underline"
                            >
                              {isProposalExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                          {application.cv && (
                            <a
                              href={getAbsoluteFileUrl(application.cv)}
                              target="_blank"
                              rel="noreferrer"
                              className="smooth-press text-sm font-medium text-indigo-600 hover:underline"
                            >
                              View Resume
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/chat?userId=${application.applicant_id}`)}
                            className="smooth-press text-sm font-medium text-indigo-600 hover:underline"
                          >
                            Message Candidate
                          </button>
                          <button
                            onClick={() => navigate(`/profile/candidates/${application.applicant_id}`)}
                            className="smooth-press text-sm font-medium text-indigo-600 hover:underline"
                          >
                            View Full Profile →
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!isHR && (
            <div className="mt-8 rounded-2xl border border-white/70 bg-white/70 p-5">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Apply for this job</h2>
              {job.created_by_id && (
                <button
                  onClick={() => navigate(`/chat?userId=${job.created_by_id}`)}
                  className="btn-secondary smooth-press mb-3"
                >
                  Message HR {job.created_by_username ? `(${job.created_by_username})` : ""}
                </button>
              )}
              {hasApplied && (
                <div className="alert-info mb-3">
                  You already applied. You can edit your cover letter and save changes.
                </div>
              )}

              {applyMessage && (
                <div className="alert-success mb-3">
                  {applyMessage}
                </div>
              )}
              {applyError && (
                <div className="alert-error mb-3">
                  {applyError}
                </div>
              )}

              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cover Letter
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => {
                  const value = e.target.value;
                  setCoverLetter(value);
                  setCoverLetterError(validateCoverLetter(value));
                  setApplyError("");
                  setApplyMessage("");
                }}
                rows={5}
                disabled={isApplying}
                placeholder="Tell the employer why you are a good fit..."
                required
                maxLength={MAX_COVER_LETTER_LENGTH}
                className="textarea-clean"
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Minimum {MIN_COVER_LETTER_LENGTH} characters required.
                </span>
                <span
                  className={`${
                    trimmedCoverLetterLength < MIN_COVER_LETTER_LENGTH
                      ? "text-amber-600"
                      : "text-gray-500"
                  }`}
                >
                  {trimmedCoverLetterLength}/{MAX_COVER_LETTER_LENGTH}
                </span>
              </div>
              {coverLetterError && (
                <div className="alert-error mt-2">
                  {coverLetterError}
                </div>
              )}

              <label className="mt-4 mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                CV (required)
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                disabled={isApplying}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedCvFile(file);
                  setCvError("");
                  setApplyError("");
                  setApplyMessage("");
                }}
                className="input-clean"
              />
              {selectedCvFile && (
                <p className="mt-2 text-xs text-gray-600">
                  Selected CV: {selectedCvFile.name}
                </p>
              )}
              {!selectedCvFile && initialCvUrl && (
                <a
                  href={getAbsoluteFileUrl(initialCvUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
                >
                  View currently uploaded CV
                </a>
              )}
              {cvError && (
                <div className="alert-error mt-2">
                  {cvError}
                </div>
              )}

              <button
                onClick={handleApply}
                disabled={isApplying || isFormInvalid || isCvMissing || (hasApplied && !hasUnsavedChanges)}
                className={`mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold transition ${
                  isApplying || isFormInvalid || isCvMissing || (hasApplied && !hasUnsavedChanges)
                    ? "cursor-not-allowed bg-slate-300 text-slate-600"
                    : "btn-primary smooth-press text-white"
                }`}
              >
                {isApplying
                  ? hasApplied
                    ? "Saving..."
                    : "Applying..."
                  : hasApplied
                    ? "Save Cover Letter"
                    : "Apply Now"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Tag({ icon, text }) {
  return (
    <span className="smooth-lift inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-sm font-semibold text-indigo-700">
      {icon} {text}
    </span>
  );
}
