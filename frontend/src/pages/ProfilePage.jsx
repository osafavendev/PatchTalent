import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import ProfileAPI from "../api/profile";
import { logout } from "../api/auth";
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const getIsHR = () => {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    const payload = jwtDecode(token);
    return payload?.is_hr === true;
  } catch { return false; }
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

const emptyExperience = { title: "", company: "", location: "", start_date: "", end_date: "", is_current: false, description: "" };
const emptyProject = { name: "", description: "", project_url: "", repo_url: "", start_date: "", end_date: "", screenshot_urls_text: "" };

const inp = "input-clean";

const Section = ({ title, subtitle, icon, children }) => (
  <div className="smooth-lift clean-card-soft overflow-hidden border-white/70 bg-white/80">
    <div className="flex items-center gap-3 border-b border-slate-200/70 px-8 py-5">
      {icon && <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">{icon}</div>}
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="px-8 py-6">{children}</div>
  </div>
);

const Label = ({ children }) => (
  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{children}</label>
);

const SaveBtn = ({ children }) => (
  <button type="submit" className="btn-primary smooth-press px-6 py-2.5">
    {children}
  </button>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const isHR = getIsHR();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  const [candidateProfile, setCandidateProfile] = useState({ headline: "", about: "", location: "", linkedin_url: "", github_url: "", portfolio_url: "", profile_picture_url: "", cv_url: "" });
  const [companyProfile, setCompanyProfile] = useState({ company_name: "", about: "", website: "", industry: "", company_size: "", headquarters: "", logo_url: "", founded_year: "" });
  const [experiences, setExperiences] = useState([]);
  const [projects, setProjects] = useState([]);
  const [experienceForm, setExperienceForm] = useState(emptyExperience);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [editingExperienceId, setEditingExperienceId] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [selectedCvFile, setSelectedCvFile] = useState(null);

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      if (isHR) {
        const res = await ProfileAPI.getCompanyProfile();
        setCompanyProfile({ company_name: res.data.company_name || "", about: res.data.about || "", website: res.data.website || "", industry: res.data.industry || "", company_size: res.data.company_size || "", headquarters: res.data.headquarters || "", logo_url: res.data.logo_url || "", founded_year: res.data.founded_year || "" });
      } else {
        const [pRes, eRes, prRes] = await Promise.all([ProfileAPI.getCandidateProfile(), ProfileAPI.getExperiences(), ProfileAPI.getProjects()]);
        setCandidateProfile({ headline: pRes.data.headline || "", about: pRes.data.about || "", location: pRes.data.location || "", linkedin_url: pRes.data.linkedin_url || "", github_url: pRes.data.github_url || "", portfolio_url: pRes.data.portfolio_url || "", profile_picture_url: pRes.data.profile_picture_url || "", cv_url: pRes.data.cv_url || "" });
        setExperiences(eRes.data || []);
        setProjects(prRes.data || []);
      }
    } catch (err) { setError(err?.response?.data?.detail || "Failed to load profile."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 2500); };

  const handleCandidateProfileSave = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = new FormData();
      payload.append("headline", candidateProfile.headline || "");
      payload.append("about", candidateProfile.about || "");
      payload.append("location", candidateProfile.location || "");
      payload.append("linkedin_url", candidateProfile.linkedin_url || "");
      payload.append("github_url", candidateProfile.github_url || "");
      payload.append("portfolio_url", candidateProfile.portfolio_url || "");
      payload.append("profile_picture_url", candidateProfile.profile_picture_url || "");
      if (selectedCvFile) {
        payload.append("cv", selectedCvFile);
      }

      const response = await ProfileAPI.updateCandidateProfile(payload);
      setCandidateProfile((prev) => ({
        ...prev,
        cv_url: response?.data?.cv_url || prev.cv_url || "",
      }));
      setSelectedCvFile(null);
      showSuccess("Profile updated.");
    } catch (err) {
      setError(err?.response?.data?.cv?.[0] || err?.response?.data?.detail || "Failed to update.");
    }
  };
  const handleCompanyProfileSave = async (e) => { e.preventDefault(); setError(""); try { await ProfileAPI.updateCompanyProfile({ ...companyProfile, founded_year: companyProfile.founded_year ? Number(companyProfile.founded_year) : null }); showSuccess("Company profile updated."); } catch (err) { setError(err?.response?.data?.detail || "Failed to update."); } };

  const handleExperienceSubmit = async (e) => {
    e.preventDefault(); setError("");
    try {
      const payload = { ...experienceForm, end_date: experienceForm.is_current ? null : experienceForm.end_date || null };
      if (editingExperienceId) { await ProfileAPI.updateExperience(editingExperienceId, payload); showSuccess("Experience updated."); }
      else { await ProfileAPI.createExperience(payload); showSuccess("Experience added."); }
      setExperienceForm(emptyExperience); setEditingExperienceId(null); await loadData();
    } catch (err) { const d = err?.response?.data; setError(d?.detail || JSON.stringify(d) || "Failed to save."); }
  };

  const startEditExperience = (item) => {
    setEditingExperienceId(item.id);
    setExperienceForm({ title: item.title || "", company: item.company || "", location: item.location || "", start_date: item.start_date || "", end_date: item.end_date || "", is_current: !!item.is_current, description: item.description || "" });
    setActiveTab("experience"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleExperienceDelete = async (id) => { setError(""); try { await ProfileAPI.deleteExperience(id); showSuccess("Experience deleted."); if (editingExperienceId === id) { setEditingExperienceId(null); setExperienceForm(emptyExperience); } await loadData(); } catch (err) { setError(err?.response?.data?.detail || "Failed to delete."); } };

  const handleProjectSubmit = async (e) => {
    e.preventDefault(); setError("");
    try {
      const screenshot_urls = projectForm.screenshot_urls_text.split("\n").map(u => u.trim()).filter(Boolean);
      const payload = { ...projectForm, screenshot_urls, start_date: projectForm.start_date || null, end_date: projectForm.end_date || null };
      delete payload.screenshot_urls_text;
      if (editingProjectId) { await ProfileAPI.updateProject(editingProjectId, payload); showSuccess("Project updated."); }
      else { await ProfileAPI.createProject(payload); showSuccess("Project added."); }
      setProjectForm(emptyProject); setEditingProjectId(null); await loadData();
    } catch (err) { const d = err?.response?.data; setError(d?.detail || JSON.stringify(d) || "Failed to save."); }
  };

  const startEditProject = (item) => {
    setEditingProjectId(item.id);
    setProjectForm({ name: item.name || "", description: item.description || "", project_url: item.project_url || "", repo_url: item.repo_url || "", start_date: item.start_date || "", end_date: item.end_date || "", screenshot_urls_text: (item.screenshots || []).map(s => s.image_url).join("\n") });
    setActiveTab("projects"); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleProjectDelete = async (id) => { setError(""); try { await ProfileAPI.deleteProject(id); showSuccess("Project deleted."); if (editingProjectId === id) { setEditingProjectId(null); setProjectForm(emptyProject); } await loadData(); } catch (err) { setError(err?.response?.data?.detail || "Failed to delete."); } };

  if (loading) return (
    <div className="app-shell flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading your profile…</p>
      </div>
    </div>
  );

  const tabs = isHR ? [] : [
    { id: "profile", label: "Profile", emoji: "👤" },
    { id: "experience", label: "Experience", emoji: "💼", count: experiences.length },
    { id: "projects", label: "Projects", emoji: "🚀", count: projects.length },
  ];

  const avatarSrc = isHR ? companyProfile.logo_url : candidateProfile.profile_picture_url;
  const heroTitle = isHR ? (companyProfile.company_name || "Your Company") : (candidateProfile.headline || "Your Profile");
  const heroSub = isHR ? (companyProfile.industry || "Complete your company profile") : (candidateProfile.location || "Complete your professional profile");

  return (
    <div className="app-shell page-enter relative">
      <div className="pointer-events-none absolute -left-14 top-20 h-48 w-48 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 top-28 h-52 w-52 rounded-full bg-fuchsia-300/20 blur-3xl" />
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <span className="font-semibold text-gray-900 text-sm hidden sm:block">{isHR ? "Company Profile" : "My Profile"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/")} className="btn-secondary smooth-press flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Jobs
            </button>
            <button onClick={logout} className="btn-danger smooth-press flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        {/* Hero banner */}
        <div className="clean-card border-white/70 bg-white/80 p-8">
          <div className="flex items-center gap-5">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl flex-shrink-0 border border-slate-200">
                {isHR ? "🏢" : "👤"}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate text-slate-900">{heroTitle}</h1>
              <p className="text-sm text-slate-500 mt-1">{heroSub}</p>
              {!isHR && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {experiences.length > 0 && <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">{experiences.length} Experience{experiences.length !== 1 ? "s" : ""}</span>}
                  {projects.length > 0 && <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700">{projects.length} Project{projects.length !== 1 ? "s" : ""}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toasts */}
        {error && <div className="alert-error flex items-center gap-2"><span>⚠️</span>{error}</div>}
        {success && <div className="alert-success flex items-center gap-2"><span>✅</span>{success}</div>}

        {/* Tab nav */}
        {!isHR && (
          <div className="clean-card-soft flex gap-1 rounded-2xl border-white/70 bg-white/70 p-1.5">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-700"}`}>
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {tab.count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-violet-100 text-violet-700" : "bg-gray-200 text-gray-500"}`}>{tab.count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── COMPANY ── */}
        {isHR && (
          <Section title="Company Details" subtitle="Shown to candidates viewing your job listings."
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}>
            <form onSubmit={handleCompanyProfileSave} className="space-y-5">
              <div className="space-y-1"><Label>Company Name</Label><input type="text" placeholder="Acme Corp" value={companyProfile.company_name} onChange={e => setCompanyProfile({ ...companyProfile, company_name: e.target.value })} className={inp} /></div>
              <div className="space-y-1"><Label>About</Label><textarea rows={5} placeholder="Your mission, culture, and what makes you unique…" value={companyProfile.about} onChange={e => setCompanyProfile({ ...companyProfile, about: e.target.value })} className={inp} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[["Website", "url", "website", "https://company.com"], ["Logo URL", "url", "logo_url", "https://..."], ["Industry", "text", "industry", "e.g. Software"], ["Company Size", "text", "company_size", "e.g. 51–200"], ["Headquarters", "text", "headquarters", "City, Country"], ["Founded Year", "number", "founded_year", "2015"]].map(([label, type, key, ph]) => (
                  <div key={key} className="space-y-1"><Label>{label}</Label><input type={type} placeholder={ph} value={companyProfile[key]} onChange={e => setCompanyProfile({ ...companyProfile, [key]: e.target.value })} className={inp} /></div>
                ))}
              </div>
              <SaveBtn>Save Company Profile</SaveBtn>
            </form>
          </Section>
        )}

        {/* ── CANDIDATE PROFILE ── */}
        {!isHR && activeTab === "profile" && (
          <Section title="Basic Information" subtitle="Your public profile visible to recruiters."
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
            <form onSubmit={handleCandidateProfileSave} className="space-y-5">
              <div className="space-y-1"><Label>Professional Headline</Label><input type="text" placeholder="e.g. Full Stack Developer · 5 years experience" value={candidateProfile.headline} onChange={e => setCandidateProfile({ ...candidateProfile, headline: e.target.value })} className={inp} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Location</Label><input type="text" placeholder="City, Country" value={candidateProfile.location} onChange={e => setCandidateProfile({ ...candidateProfile, location: e.target.value })} className={inp} /></div>
              </div>
              <div className="space-y-1">
                <Label>Profile Picture URL</Label>
                <input type="url" placeholder="https://..." value={candidateProfile.profile_picture_url} onChange={e => setCandidateProfile({ ...candidateProfile, profile_picture_url: e.target.value })} className={inp} />
              </div>
              <div className="space-y-2">
                <Label>CV / Resume</Label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => setSelectedCvFile(e.target.files?.[0] || null)}
                  className={inp}
                />
                {selectedCvFile && (
                  <p className="text-xs text-violet-700">
                    New file selected: {selectedCvFile.name}
                  </p>
                )}
                {!selectedCvFile && candidateProfile.cv_url && (
                  <a
                    href={getAbsoluteFileUrl(candidateProfile.cv_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-xs font-medium text-indigo-600 hover:underline"
                  >
                    View uploaded CV
                  </a>
                )}
              </div>
              {candidateProfile.profile_picture_url && (
                <div className="clean-card-soft flex items-center gap-4 border-white/70 bg-white/70 p-4">
                  <img src={candidateProfile.profile_picture_url} alt="Preview" className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow" />
                  <p className="text-sm text-gray-400">Profile picture preview</p>
                </div>
              )}
              <div className="space-y-3">
                <Label>Social Links</Label>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[["🔗", "linkedin_url", "LinkedIn URL"], ["💻", "github_url", "GitHub URL"]].map(([emoji, key, ph]) => (
                    <div key={key} className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">{emoji}</span><input type="url" placeholder={ph} value={candidateProfile[key]} onChange={e => setCandidateProfile({ ...candidateProfile, [key]: e.target.value })} className={`${inp} pl-9`} /></div>
                  ))}
                  <div className="relative sm:col-span-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">🌐</span><input type="url" placeholder="Portfolio / Website" value={candidateProfile.portfolio_url} onChange={e => setCandidateProfile({ ...candidateProfile, portfolio_url: e.target.value })} className={`${inp} pl-9`} /></div>
                </div>
              </div>
              <div className="space-y-1"><Label>About</Label><textarea rows={5} placeholder="Tell recruiters about your skills, goals, and what you're looking for…" value={candidateProfile.about} onChange={e => setCandidateProfile({ ...candidateProfile, about: e.target.value })} className={inp} /></div>
              <SaveBtn>Save Profile</SaveBtn>
            </form>
          </Section>
        )}

        {/* ── EXPERIENCE ── */}
        {!isHR && activeTab === "experience" && (
          <div className="space-y-4">
            <Section title={editingExperienceId ? "Edit Experience" : "Add Experience"} subtitle="Your work history helps companies understand your background."
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}>
              <form onSubmit={handleExperienceSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Job Title *</Label><input type="text" placeholder="e.g. Senior Engineer" value={experienceForm.title} onChange={e => setExperienceForm({ ...experienceForm, title: e.target.value })} required className={inp} /></div>
                  <div className="space-y-1"><Label>Company *</Label><input type="text" placeholder="e.g. Acme Corp" value={experienceForm.company} onChange={e => setExperienceForm({ ...experienceForm, company: e.target.value })} required className={inp} /></div>
                  <div className="space-y-1"><Label>Location</Label><input type="text" placeholder="City, Country or Remote" value={experienceForm.location} onChange={e => setExperienceForm({ ...experienceForm, location: e.target.value })} className={inp} /></div>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                    <input id="is_current" type="checkbox" checked={experienceForm.is_current} onChange={e => setExperienceForm({ ...experienceForm, is_current: e.target.checked, end_date: e.target.checked ? "" : experienceForm.end_date })} className="w-4 h-4 rounded accent-violet-600" />
                    <label htmlFor="is_current" className="text-sm text-gray-700 cursor-pointer select-none">I currently work here</label>
                  </div>
                  <div className="space-y-1"><Label>Start Date *</Label><input type="date" value={experienceForm.start_date} onChange={e => setExperienceForm({ ...experienceForm, start_date: e.target.value })} required className={inp} /></div>
                  <div className="space-y-1"><Label>End Date</Label><input type="date" value={experienceForm.end_date} onChange={e => setExperienceForm({ ...experienceForm, end_date: e.target.value })} disabled={experienceForm.is_current} className={`${inp} disabled:opacity-40 disabled:cursor-not-allowed`} /></div>
                </div>
                <div className="space-y-1"><Label>Description</Label><textarea rows={4} placeholder="Describe your responsibilities, achievements, and impact…" value={experienceForm.description} onChange={e => setExperienceForm({ ...experienceForm, description: e.target.value })} className={inp} /></div>
                <div className="flex gap-3">
                  <SaveBtn>{editingExperienceId ? "Update Experience" : "Add Experience"}</SaveBtn>
                  {editingExperienceId && <button type="button" onClick={() => { setEditingExperienceId(null); setExperienceForm(emptyExperience); }} className="btn-secondary smooth-press">Cancel</button>}
                </div>
              </form>
            </Section>

            {experiences.length === 0 ? (
              <div className="clean-card-soft border-2 border-dashed border-white/70 bg-white/70 py-14 text-center">
                <div className="text-4xl mb-3">💼</div>
                <p className="text-gray-400 text-sm">No experiences yet. Add your first one above.</p>
              </div>
            ) : experiences.map(item => (
              <div key={item.id} className="smooth-lift clean-card-soft border-white/70 bg-white/80 p-6 group">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-violet-600 font-medium mt-0.5">{item.company}</p>
                    {item.location && <p className="text-xs text-gray-400 mt-1">📍 {item.location}</p>}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditExperience(item)} className="smooth-press rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Edit</button>
                    <button onClick={() => handleExperienceDelete(item.id)} className="smooth-press rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-gray-400">{item.start_date} → {item.is_current ? "Present" : item.end_date || "—"}</span>
                  {item.is_current && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">Current</span>}
                </div>
                {item.description && <p className="text-sm text-gray-600 leading-relaxed mt-3">{item.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── PROJECTS ── */}
        {!isHR && activeTab === "projects" && (
          <div className="space-y-4">
            <Section title={editingProjectId ? "Edit Project" : "Add Project"} subtitle="Showcase your work — side projects, open source, and portfolio pieces."
              icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div className="space-y-1"><Label>Project Name *</Label><input type="text" placeholder="e.g. Portfolio Tracker" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} required className={inp} /></div>
                <div className="space-y-1"><Label>Description</Label><textarea rows={3} placeholder="What does it do? What tech did you use?" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} className={inp} /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Live URL</Label><input type="url" placeholder="https://myproject.com" value={projectForm.project_url} onChange={e => setProjectForm({ ...projectForm, project_url: e.target.value })} className={inp} /></div>
                  <div className="space-y-1"><Label>Repository</Label><input type="url" placeholder="https://github.com/…" value={projectForm.repo_url} onChange={e => setProjectForm({ ...projectForm, repo_url: e.target.value })} className={inp} /></div>
                  <div className="space-y-1"><Label>Start Date</Label><input type="date" value={projectForm.start_date} onChange={e => setProjectForm({ ...projectForm, start_date: e.target.value })} className={inp} /></div>
                  <div className="space-y-1"><Label>End Date</Label><input type="date" value={projectForm.end_date} onChange={e => setProjectForm({ ...projectForm, end_date: e.target.value })} className={inp} /></div>
                </div>
                <div className="space-y-1"><Label>Screenshot URLs (one per line)</Label><textarea rows={3} placeholder="https://i.imgur.com/..." value={projectForm.screenshot_urls_text} onChange={e => setProjectForm({ ...projectForm, screenshot_urls_text: e.target.value })} className={inp} /></div>
                <div className="flex gap-3">
                  <SaveBtn>{editingProjectId ? "Update Project" : "Add Project"}</SaveBtn>
                  {editingProjectId && <button type="button" onClick={() => { setEditingProjectId(null); setProjectForm(emptyProject); }} className="btn-secondary smooth-press">Cancel</button>}
                </div>
              </form>
            </Section>

            {projects.length === 0 ? (
              <div className="clean-card-soft border-2 border-dashed border-white/70 bg-white/70 py-14 text-center">
                <div className="text-4xl mb-3">🚀</div>
                <p className="text-gray-400 text-sm">No projects yet. Add your first one above.</p>
              </div>
            ) : projects.map(item => (
              <div key={item.id} className="smooth-lift clean-card-soft border-white/70 bg-white/80 p-6 group">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => startEditProject(item)} className="smooth-press rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Edit</button>
                    <button onClick={() => handleProjectDelete(item.id)} className="smooth-press rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Delete</button>
                  </div>
                </div>
                {item.description && <p className="text-sm text-gray-600 leading-relaxed mt-2">{item.description}</p>}
                <div className="flex gap-4 mt-3">
                  {item.project_url && <a href={item.project_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-800 transition"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>Live Demo</a>}
                  {item.repo_url && <a href={item.repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>Repository</a>}
                </div>
                {item.screenshots?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {item.screenshots.map(shot => <img key={shot.id} src={shot.image_url} alt="Screenshot" className="w-full h-28 object-cover rounded-xl border border-gray-100 shadow-sm" />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}