import axios from 'axios';

// Determine API URL based on environment
// In production (Vercel), use relative URLs which will be handled by vercel.json rewrites
// In development, use the local server or VITE_API_URL if set
const getApiUrl = () => {
  // If VITE_API_URL is explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production (Vercel), use relative URL
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // In development, use local server
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // For FormData uploads, let the browser set Content-Type with boundary
  // Don't set Content-Type header manually for FormData - browser will handle it
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page to prevent infinite loops
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use setTimeout to avoid navigation during promise rejection handling
        setTimeout(() => {
          window.location.href = '/login';
        }, 0);
      } else {
        // Clear storage even if we're on login page
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    // Enhance error with more details for debugging
    if (!error.response) {
      // Network error, timeout, or server not reachable
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        error.message = 'Request timed out. The server is taking too long to respond.';
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        error.message = 'Network error. Please check your internet connection and try again.';
      } else {
        error.message = error.message || 'Unable to connect to the server. Please try again later.';
      }
    } else if (error.response.status >= 500) {
      // Server errors
      error.message = error.response.data?.error?.message || 
                     error.response.data?.error || 
                     error.response.data?.message || 
                     'Server error. Please try again later.';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (email, password, name, rememberMe = false) => {
    const response = await api.post('/auth/register', { email, password, name, rememberMe });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
    }
    return response.data;
  },
  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  verifyToken: async () => {
    try {
      // Use the verify endpoint to check token validity
      await api.get('/auth/verify');
      return true;
    } catch (error) {
      return false;
    }
  },
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects').then((res) => res.data.projects),
  getOne: (id) => api.get(`/projects/${id}`).then((res) => res.data),
  create: (data) => api.post('/projects', data).then((res) => res.data),
  update: (id, data) => api.put(`/projects/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/projects/${id}`).then((res) => res.data),
  addMilestone: (projectId, data) =>
    api.post(`/projects/${projectId}/milestones`, data).then((res) => res.data),
  updateMilestone: (projectId, milestoneId, data) =>
    api.put(`/projects/${projectId}/milestones/${milestoneId}`, data).then((res) => res.data),
  getRecommendations: (projectId) =>
    api.get(`/projects/${projectId}/recommendations`).then((res) => res.data.recommendations),
};

// Skills API
export const skillsAPI = {
  getAll: () => api.get('/skills').then((res) => res.data.skills),
  create: (data) => api.post('/skills', data).then((res) => res.data),
  update: (id, data) => api.put(`/skills/${id}`, data).then((res) => res.data),
  delete: (id) => api.delete(`/skills/${id}`).then((res) => res.data),
};

// AI Chat API
export const aiAPI = {
  getMessages: (limit = 50) => api.get(`/ai/messages?limit=${limit}`).then((res) => res.data.messages),
  sendMessage: (message) => api.post('/ai/chat', { message }).then((res) => res.data),
  getModel: () => api.get('/ai/model').then((res) => res.data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats').then((res) => res.data),
  getRecentProjects: (limit = 3) =>
    api.get(`/dashboard/recent-projects?limit=${limit}`).then((res) => res.data.projects),
  getNotifications: () => api.get('/dashboard/notifications').then((res) => res.data.notifications),
  getSkillGaps: () => api.get('/dashboard/skill-gaps').then((res) => res.data.skillGaps),
};

// Concepts API
export const conceptsAPI = {
  getAll: () => api.get('/concepts').then((res) => res.data.concepts),
  getOne: (id) => api.get(`/concepts/${id}`).then((res) => res.data.concept),
  generate: (topic, category) => 
    api.post('/concepts/generate', { topic, category }).then((res) => res.data.concept),
  create: (data) => api.post('/concepts', data).then((res) => res.data.concept),
  update: (id, data) => api.put(`/concepts/${id}`, data).then((res) => res.data.concept),
  delete: (id) => api.delete(`/concepts/${id}`).then((res) => res.data),
};

// Resumes API
export const resumesAPI = {
  get: () => api.get('/resumes').then((res) => res.data.resume),
  upload: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    // Don't set Content-Type header - let browser set it with boundary automatically
    return api.post('/resumes/upload', formData).then((res) => res.data.resume);
  },
  getFeedback: (resumeId, content) => 
    api.post('/resumes/feedback', { resumeId, content }).then((res) => res.data.feedback),
  getRecommendations: (resumeId, content) =>
    api.post('/resumes/recommendations', { resumeId, content }).then((res) => res.data),
  update: (id, data) => api.put(`/resumes/${id}`, data).then((res) => res.data.resume),
  download: (id) => api.get(`/resumes/${id}/download`, { responseType: 'blob' }),
  generateProjectBullets: (projectId) => 
    api.post('/resumes/generate-project-bullets', { projectId }).then((res) => res.data.bullets),
  getProjectBullets: () => 
    api.get('/resumes/project-bullets').then((res) => res.data.bulletsByProject),
};

// Practice API
export const practiceAPI = {
  analyzeResponse: (data) => 
    api.post('/practice/analyze-response', data).then((res) => res.data),
  getSessions: () => 
    api.get('/practice/sessions').then((res) => res.data.sessions),
};

export default api;
