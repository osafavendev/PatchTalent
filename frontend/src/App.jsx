import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import JobsDashboard from "./pages/JobsDashboard";
import JobDetailPage from "./pages/JobDetailPage";
import ProfilePage from "./pages/ProfilePage";
import CandidateProfileDetailPage from "./pages/CandidateProfileDetailPage";
import ChatPage from "./pages/ChatPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("access_token")
  );

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("access_token");
      setIsAuthenticated(!!token);
    };

    checkAuth();
    // listen for auth changes across tabs and within the same tab
    window.addEventListener("storage", checkAuth);
    window.addEventListener("auth-changed", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("auth-changed", checkAuth);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
        />

        <Route
          path="/register"
          element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />}
        />

        <Route
          path="/"
          element={isAuthenticated ? <JobsDashboard /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/jobs/:id"
          element={isAuthenticated ? <JobDetailPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/profile"
          element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/profile/candidates/:userId"
          element={isAuthenticated ? <CandidateProfileDetailPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/chat"
          element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;