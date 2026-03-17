import AuthAPI from "./auth";

const ProfileAPI = {
  getCandidateProfile: () => AuthAPI.get("profile/me/"),
  getCandidateProfileByUserId: (userId) => AuthAPI.get(`profile/candidates/${userId}/`),
  updateCandidateProfile: (payload) =>
    AuthAPI.put("profile/me/", payload, payload instanceof FormData ? {
      headers: { "Content-Type": "multipart/form-data" },
    } : undefined),

  getCompanyProfile: () => AuthAPI.get("profile/company/"),
  updateCompanyProfile: (payload) => AuthAPI.put("profile/company/", payload),

  getExperiences: () => AuthAPI.get("profile/experiences/"),
  createExperience: (payload) => AuthAPI.post("profile/experiences/", payload),
  updateExperience: (id, payload) => AuthAPI.put(`profile/experiences/${id}/`, payload),
  deleteExperience: (id) => AuthAPI.delete(`profile/experiences/${id}/`),

  getProjects: () => AuthAPI.get("profile/projects/"),
  createProject: (payload) => AuthAPI.post("profile/projects/", payload),
  updateProject: (id, payload) => AuthAPI.put(`profile/projects/${id}/`, payload),
  deleteProject: (id) => AuthAPI.delete(`profile/projects/${id}/`),
};

export default ProfileAPI;
