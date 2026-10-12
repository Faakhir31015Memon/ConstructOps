import axios from 'axios';

// Same-origin on Vercel (/api/v1) unless VITE_API_BASE_URL points to a separate backend
const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

const API = axios.create({
  baseURL: BASE_URL,
});

// Interceptor to inject Token into Authorization headers
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle session expirations
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are not already on login/register page, redirect
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- AUTH API METHODS ---
export const login = async (email, password) => {
  const { data } = await API.post('/auth/login', { email, password });
  return data;
};

export const register = async (name, email, password, companyName) => {
  const { data } = await API.post('/auth/register', { name, email, password, companyName });
  return data;
};

export const getMe = async () => {
  const { data } = await API.get('/auth/me');
  return data;
};

// --- PROJECT API METHODS ---
export const getProjects = async () => {
  const { data } = await API.get('/projects');
  return data;
};

export const getProjectDetail = async (id) => {
  const { data } = await API.get(`/projects/${id}`);
  return data;
};

export const createProject = async (projectData) => {
  const { data } = await API.post('/projects', projectData);
  return data;
};

export const deleteProject = async (id) => {
  const { data } = await API.delete(`/projects/${id}`);
  return data;
};

export const updateProject = async (id, projectData) => {
  const { data } = await API.put(`/projects/${id}`, projectData);
  return data;
};

export const getProjectDashboard = async (id) => {
  const { data } = await API.get(`/projects/${id}/dashboard`);
  return data;
};

// --- WORKER API METHODS ---
export const getWorkers = async (projectId) => {
  const { data } = await API.get(`/workers?projectId=${projectId}`);
  return data;
};

export const addWorker = async (workerData) => {
  const { data } = await API.post('/workers', workerData);
  return data;
};

export const deleteWorker = async (id) => {
  const { data } = await API.delete(`/workers/${id}`);
  return data;
};

export const checkInAttendance = async (attendanceData) => {
  const { data } = await API.post('/workers/attendance/check-in', attendanceData);
  return data;
};

export const getAttendance = async (projectId, date) => {
  const { data } = await API.get(`/workers/attendance?projectId=${projectId}&date=${date}`);
  return data;
};

// --- MATERIAL API METHODS ---
export const getMaterials = async (projectId) => {
  const { data } = await API.get(`/materials?projectId=${projectId}`);
  return data;
};

export const addMaterial = async (materialData) => {
  const { data } = await API.post('/materials', materialData);
  return data;
};

export const logMaterialTransaction = async (logData) => {
  const { data } = await API.post('/materials/log', logData);
  return data;
};

export const getMaterialLogs = async (projectId) => {
  const { data } = await API.get(`/materials/logs?projectId=${projectId}`);
  return data;
};

// --- EXPENSE API METHODS ---
export const getExpenses = async (projectId, category = '') => {
  const url = category ? `/expenses?projectId=${projectId}&category=${category}` : `/expenses?projectId=${projectId}`;
  const { data } = await API.get(url);
  return data;
};

export const addExpense = async (expenseData) => {
  const { data } = await API.post('/expenses', expenseData);
  return data;
};

export const deleteExpense = async (id) => {
  const { data } = await API.delete(`/expenses/${id}`);
  return data;
};

// --- DAILY REPORT API METHODS ---
export const getReports = async (projectId) => {
  const { data } = await API.get(`/reports?projectId=${projectId}`);
  return data;
};

export const createReport = async (reportData) => {
  const { data } = await API.post('/reports', reportData);
  return data;
};

export const getAlerts = async (projectId) => {
  const url = projectId ? `/alerts?projectId=${projectId}` : '/alerts';
  const { data } = await API.get(url);
  return data;
};

export const markAlertRead = async (id) => {
  const { data } = await API.put(`/alerts/${id}/read`);
  return data;
};

// --- ADMIN & GENERAL DASHBOARD API METHODS ---
export const loginAdmin = async (email, password) => {
  const { data } = await API.post('/auth/admin/login', { email, password });
  return data;
};

export const getDashboardStats = async () => {
  const { data } = await API.get('/dashboard');
  return data;
};

export const getUsers = async () => {
  const { data } = await API.get('/users');
  return data;
};

export const updateUserStatus = async (id, status) => {
  const { data } = await API.put(`/users/${id}/status`, { status });
  return data;
};

export const deleteUser = async (id) => {
  const { data } = await API.delete(`/users/${id}`);
  return data;
};

// --- CONTRACTOR & MULTI-TENANT MANAGEMENT API METHODS ---
export const getContractors = async () => {
  const { data } = await API.get('/contractors');
  return data;
};

export const createContractor = async (contractorData) => {
  const { data } = await API.post('/contractors', contractorData);
  return data;
};

export const assignContractor = async (projectId, contractorId) => {
  const { data } = await API.post('/contractors/assign', { projectId, contractorId });
  return data;
};

export const revokeContractor = async (projectId, contractorId) => {
  const { data } = await API.post('/contractors/revoke', { projectId, contractorId });
  return data;
};

export const reviewExpense = async (expenseId, status, rejectionReason = '') => {
  const { data } = await API.put(`/expenses/${expenseId}/review`, { status, rejectionReason });
  return data;
};

export const getProjectContract = async (projectId) => {
  const { data } = await API.get(`/contractors/contracts/${projectId}`);
  return data;
};

export const saveProjectContract = async (contractData) => {
  const { data } = await API.post('/contractors/contracts', contractData);
  return data;
};

export const getProjectPayments = async (projectId) => {
  const { data } = await API.get(`/contractors/payments/${projectId}`);
  return data;
};

export const recordProjectPayment = async (paymentData) => {
  const { data } = await API.post('/contractors/payments', paymentData);
  return data;
};

export default API;

