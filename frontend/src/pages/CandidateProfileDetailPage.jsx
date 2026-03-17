import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import ProfileAPI from "../api/profile";

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

export default function CandidateProfileDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const isHR = getIsHR();

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!isHR) {
      setStatus("error");
      setError("Only HR users can view candidate profile details.");
      return;
    }

    ProfileAPI.getCandidateProfileByUserId(userId)
      .then((res) => {
        setProfile(res.data);
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setError(err?.response?.data?.detail || "Failed to load candidate profile.");
      });
  }, [isHR, userId]);

  if (status === "loading") {
    return (
      <div className="app-shell flex items-center justify-center">
        <p className="text-gray-600">Loading candidate profile...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="app-shell flex items-center justify-center px-4">
        <div className="clean-card w-full max-w-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary mt-4"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell page-enter relative py-8 px-4">
      <div className="pointer-events-none absolute -left-14 top-20 h-44 w-44 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-36 h-44 w-44 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="clean-card flex flex-wrap items-center justify-between gap-3 border-white/70 bg-white/80 p-4 sm:p-5">
          <button
            onClick={() => navigate(-1)}
            className="smooth-press text-sm font-semibold text-indigo-700 hover:underline"
          >
            ← Back to Job Details
          </button>
          <button
            onClick={() => navigate(`/chat?userId=${userId}`)}
            className="btn-secondary smooth-press"
          >
            Message Candidate
          </button>
        </div>

        <section className="smooth-lift clean-card border-white/70 bg-white/80 p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
            <span className="glass-dot" />
            Candidate Overview
          </div>
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <div className="w-28 h-28 rounded-full overflow-hidden border border-gray-200 bg-gray-100">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt={`${profile.user_username} profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  No Photo
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{profile.user_username}</h1>
              <p className="text-gray-600 mt-1">{profile.user_email}</p>
              {profile.headline && (
                <p className="mt-2 text-lg font-medium text-indigo-700">{profile.headline}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {profile.location && (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {profile.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {profile.about && (
            <div className="mt-6 border-t pt-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">About</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{profile.about}</p>
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Links</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  LinkedIn
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  GitHub
                </a>
              )}
              {profile.portfolio_url && (
                <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  Portfolio
                </a>
              )}
              {!profile.linkedin_url && !profile.github_url && !profile.portfolio_url && (
                <span className="text-gray-500">No links provided.</span>
              )}
            </div>
          </div>
        </section>

        <section className="smooth-lift clean-card-soft border-white/70 bg-white/80 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Experience</h2>
          {profile.experiences?.length ? (
            <div className="space-y-4">
              {profile.experiences.map((exp) => (
                <article key={exp.id} className="smooth-lift rounded-xl border border-white/70 bg-white/70 p-4">
                  <h3 className="font-semibold text-gray-900">
                    {exp.title} • {exp.company}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {exp.start_date} - {exp.is_current ? "Present" : exp.end_date || "-"}
                  </p>
                  {exp.location && <p className="text-sm text-gray-600 mt-1">{exp.location}</p>}
                  {exp.description && (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{exp.description}</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No experience provided.</p>
          )}
        </section>

        <section className="smooth-lift clean-card-soft border-white/70 bg-white/80 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Projects</h2>
          {profile.projects?.length ? (
            <div className="space-y-4">
              {profile.projects.map((project) => (
                <article key={project.id} className="smooth-lift rounded-xl border border-white/70 bg-white/70 p-4">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{project.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    {project.project_url && (
                      <a href={project.project_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                        Live Project
                      </a>
                    )}
                    {project.repo_url && (
                      <a href={project.repo_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                        Repository
                      </a>
                    )}
                  </div>
                  {project.screenshots?.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
                      {project.screenshots.map((shot) => (
                        <img
                          key={shot.id}
                          src={shot.image_url}
                          alt="Project screenshot"
                          className="w-full h-28 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No projects provided.</p>
          )}
        </section>
      </div>
    </div>
  );
}
