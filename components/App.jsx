import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/lib/auth.jsx';
import { LandingPage } from './LandingPage';
import { Login } from './Login';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { AIMentor } from './AIMentor';
import { ProjectBuilder } from './ProjectBuilder';
import { ConceptExplainer } from './ConceptExplainer';
import { PracticeMode } from './PracticeMode';
import { ResumePrep } from './ResumePrep';
import { SkillTracker } from './SkillTracker';
import { Settings } from './Settings';

// These components must be used inside AuthProvider
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/home" replace />;
}

function AppRoutesContent() {
  // Load dark mode preference from localStorage, default to true if not set
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    // If no saved preference, default to true (dark mode)
    return saved !== null ? saved === 'true' : true;
  });
  const { isAuthenticated, isLoading } = useAuth();

  // Apply dark class to root HTML element and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Persist preference to localStorage, overriding system settings
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center" role="status" aria-live="polite" aria-label="Loading application">
        <div className="text-[#888888]">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#0070F3] focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen bg-background text-foreground">
        {isAuthenticated && <Sidebar darkMode={darkMode} />}
        <main id="main-content" className={`${isAuthenticated ? 'flex-1' : 'w-full'} overflow-y-auto bg-background`}>
          <Routes>
            <Route
              path="/"
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              }
            />
            <Route
              path="/home"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/mentor"
              element={
                <PrivateRoute>
                  <AIMentor />
                </PrivateRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <PrivateRoute>
                  <ProjectBuilder />
                </PrivateRoute>
              }
            />
            <Route
              path="/explainer"
              element={
                <PrivateRoute>
                  <ConceptExplainer />
                </PrivateRoute>
              }
            />
            <Route
              path="/practice"
              element={
                <PrivateRoute>
                  <PracticeMode />
                </PrivateRoute>
              }
            />
            <Route
              path="/resume"
              element={
                <PrivateRoute>
                  <ResumePrep />
                </PrivateRoute>
              }
            />
            <Route
              path="/skills"
              element={
                <PrivateRoute>
                  <SkillTracker />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <Settings darkMode={darkMode} setDarkMode={setDarkMode} />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutesContent />
      </Router>
    </AuthProvider>
  );
}
