import { useState, useEffect } from "react";
import JobsAPI from "../api/jobs";
import ReactMde from "react-mde";
import Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";

export default function JobForm({ job, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: job?.title || "",
    description: job?.description || "",
    job_type: job?.job_type || "remote",
    job_location: job?.job_location || "",
  });
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState("write");

  // Markdown converter
  const converter = new Showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (job) {
        await JobsAPI.put(`${job.id}/`, form);
      } else {
        await JobsAPI.post("create/", form);
      }
      onSuccess();
    } catch (err) {
      const data = err.response?.data;
      setError(data?.detail || JSON.stringify(data) || "Something went wrong.");
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        className="clean-card page-enter relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border-white/70 bg-white/90 p-8 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-xl font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Header */}
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
          <span className="glass-dot" />
          Job Composer
        </div>
        <h2 className="mb-5 text-2xl font-bold text-gray-800 md:text-3xl">
          {job ? "Edit Job" : "Create Job"}
        </h2>

        {/* Error Message */}
        {error && (
          <div className="alert-error mb-5 font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Title */}
          <div className="flex flex-col">
            <label htmlFor="title" className="mb-1 font-medium text-gray-700">
              Job Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="input-clean"
            />
          </div>

          {/* Job Description with Markdown Editor */}
          <div className="flex flex-col">
            <label htmlFor="description" className="mb-1 font-medium text-gray-700">
              Job Description (Markdown + Preview)
            </label>
            <div className="clean-card-soft border-white/60 bg-white/70 overflow-hidden rounded-xl">
              <ReactMde
                value={form.description}
                onChange={(value) => setForm({ ...form, description: value })}
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                generateMarkdownPreview={(markdown) =>
                  Promise.resolve(converter.makeHtml(markdown))
                }
                minEditorHeight={200}
                heightUnits="px"
                childProps={{
                  writeButton: {
                    tabIndex: -1,
                  },
                  preview: {
                    style: { maxHeight: "400px", overflowY: "auto" }, // scrollable preview
                  },
                  textArea: {
                    style: { maxHeight: "400px", overflowY: "auto" }, // scrollable editor
                    placeholder:
                      "Write full job details in Markdown (headings, lists, links, code blocks, tables, etc.)",
                  },
                }}
              />
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Use the Write/Preview tabs to format and preview Markdown before posting.
            </p>
          </div>

          {/* Job Type */}
          <div className="flex flex-col">
            <label htmlFor="job_type" className="mb-1 font-medium text-gray-700">
              Job Type
            </label>
            <select
              id="job_type"
              name="job_type"
              value={form.job_type}
              onChange={(e) => setForm({ ...form, job_type: e.target.value })}
              className="input-clean"
            >
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>

          {/* Job Location */}
          {(form.job_type === "hybrid" || form.job_type === "onsite") && (
            <div className="flex flex-col">
              <label htmlFor="job_location" className="mb-1 font-medium text-gray-700">
                Job Location
              </label>
              <input
                id="job_location"
                name="job_location"
                type="text"
                value={form.job_location}
                onChange={(e) => setForm({ ...form, job_location: e.target.value })}
                required
                className="input-clean"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary smooth-press px-6 py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary smooth-press px-6 py-2.5"
            >
              {job ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
