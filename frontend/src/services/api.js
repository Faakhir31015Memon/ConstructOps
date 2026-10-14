import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api/v1`
  : '/api/v1';

const API = axios.create({
  baseURL: BASE_URL,
});

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'constructops_refresh_token';

export const getSessionToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setSession = ({ token, refreshToken }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  // Admin logins have no refresh token — the old one must not survive.
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_KEY);
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem('user');
};

const redirectToLogin = () => {
  if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
    window.location.href = '/login?expired=1';
  }
};

// Interceptor to inject Token into Authorization headers
API.interceptors.request.use(
  (config) => {
    const token = getSessionToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Access tokens are short-lived, so a 401 with an expired token triggers one
// silent refresh and a retry of the original request. Concurrent requests share
// a single refresh call, and a rotation failure ends the session.
let refreshInFlight = null;

const refreshSession = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${BASE_URL}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        setSession(data);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        return data.token;
      })
      .catch(() => {
        clearSession();
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    const code = response.data?.code;
    const isAuthEndpoint = (config.url || '').includes('/auth/');

    if (response.status === 401 && !isAuthEndpoint && !config._retried &&
        (code === 'TOKEN_EXPIRED' || code === 'TOKEN_REVOKED' || code === 'NO_TOKEN')) {
      config._retried = true;
      const newToken = await refreshSession();
      if (newToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newToken}`;
        return API(config);
      }
      redirectToLogin();
      return Promise.reject(error);
    }

    if (response.status === 401 && !isAuthEndpoint) {
      clearSession();
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

// --- AUTH API METHODS ---
export const login = async (email, password) => {
  const { data } = await API.post('/auth/login', { email, password });
  return data;
};

export const register = async (name, email, password, companyName, language) => {
  const { data } = await API.post('/auth/register', { name, email, password, companyName, language });
  return data;
};

export const getMe = async () => {
  const { data } = await API.get('/auth/me');
  return data;
};

export const saveLanguage = async (language) => {
  const { data } = await API.patch('/auth/language', { language });
  return data;
};

export const requestPasswordReset = async (email) => {
  const { data } = await API.post('/auth/forgot-password', { email });
  return data;
};

export const resetPassword = async (token, password) => {
  const { data } = await API.post('/auth/reset-password', { token, password });
  return data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await API.patch('/auth/password', { currentPassword, newPassword });
  return data;
};

export const logoutRequest = async ({ allDevices = false } = {}) => {
  const { data } = await API.post('/auth/logout', {
    refreshToken: getRefreshToken(),
    allDevices,
  });
  return data;
};

// --- SUBSCRIPTION API METHODS ---
export const getSubscriptionStatus = async () => {
  const { data } = await API.get('/subscription/status');
  return data;
};

export const getSubscriptionPlans = async () => {
  const { data } = await API.get('/subscription/plans');
  return data;
};

export const submitSubscriptionPayment = async (paymentData) => {
  const { data } = await API.post('/subscription/payment', paymentData);
  return data;
};

export const getMyPayments = async () => {
  const { data } = await API.get('/subscription/payments');
  return data;
};

// --- BILLING / BANKS / GATEWAY API METHODS ---
export const getPakBanks = async () => {
  const { data } = await API.get('/billing/banks');
  return data;
};

export const getGatewayStatus = async () => {
  const { data } = await API.get('/billing/gateway-status');
  return data;
};

// --- AI ASSISTANT API METHODS ---
export const sendAssistantMessage = async (messages, lang) => {
  const { data } = await API.post('/assistant/chat', { messages, lang });
  return data;
};

export const getAssistantSuggestions = async (lang) => {
  const { data } = await API.get(`/assistant/suggestions?lang=${encodeURIComponent(lang)}`);
  return data;
};

export const getAssistantVoiceConfig = async (lang) => {
  const { data } = await API.get(`/assistant/voice-config?lang=${encodeURIComponent(lang)}`);
  return data;
};


// --- ADMIN SUBSCRIPTION PAYMENT VERIFICATION ---
export const getAllSubscriptionPayments = async (status = '') => {
  const url = status ? `/subscription/admin/payments?status=${status}` : '/subscription/admin/payments';
  const { data } = await API.get(url);
  return data;
};

export const approveSubscriptionPayment = async (id, reviewNote = '') => {
  const { data } = await API.put(`/subscription/admin/payments/${id}/approve`, { reviewNote });
  return data;
};

export const rejectSubscriptionPayment = async (id, reviewNote = '') => {
  const { data } = await API.put(`/subscription/admin/payments/${id}/reject`, { reviewNote });
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

// Send a batch of offline-captured attendance rows; the API upserts idempotently.
export const bulkCheckInAttendance = async (projectId, records) => {
  const { data } = await API.post('/workers/attendance/bulk', { projectId, records });
  return data;
};

export const getPayroll = async (projectId, month) => {
  const { data } = await API.get(`/workers/payroll?projectId=${projectId}&month=${encodeURIComponent(month || '')}`);
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

// Multipart photo upload — returns { urls: ['/uploads/...'] }
export const uploadReportPhotos = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  const { data } = await API.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
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

// --- AUDIT TRAIL API METHODS ---
export const getAuditEvents = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, String(value));
  });
  const query = params.toString();
  const { data } = await API.get(`/audit${query ? `?${query}` : ''}`);
  return data;
};

// --- NOTIFICATION / WHATSAPP DIGEST API METHODS ---
export const getDigestSettings = async () => {
  const { data } = await API.get('/notifications/settings');
  return data;
};

export const saveDigestSettings = async (projectId, dailyDigest, whatsappNumbers) => {
  const { data } = await API.put('/notifications/settings', { projectId, dailyDigest, whatsappNumbers });
  return data;
};

export const triggerDigest = async (projectId, send) => {
  const { data } = await API.post('/notifications/digest', { projectId, send });
  return data;
};

// --- ACTIVATION METRICS API METHODS ---
export const getCompanyActivation = async () => {
  const { data } = await API.get('/metrics/activation');
  return data;
};

export const getAdminFunnel = async (days = 30) => {
  const { data } = await API.get(`/metrics/funnel?days=${days}`);
  return data;
};

// --- INVOICE / DOCUMENT DOWNLOADS ---
export const downloadInvoice = async (url) => {
  const response = await API.get(url, { responseType: 'blob' });
  const disposition = response.headers['content-disposition'] || '';
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainName = disposition.match(/filename="([^"]+)"/i);
  const filename = decodeURIComponent(utf8Name?.[1] || plainName?.[1] || 'constructops-invoice.pdf');
  return { blob: response.data, filename };
};

export const subscriptionInvoiceUrl = (paymentId) => `/subscription/invoice/${paymentId}`;
export const contractorPaymentInvoiceUrl = (paymentId) => `/contractors/invoice/${paymentId}`;
export const payrollInvoiceUrl = (projectId, month) =>
  `/workers/payroll/invoice?projectId=${projectId}&month=${encodeURIComponent(month || '')}`;

// --- EXPORT REPORT API METHODS ---
const requestExport = async (url) => {
  const response = await API.get(url, { responseType: 'blob' });
  if (response.data.type && response.data.type.includes('application/json')) {
    const text = await response.data.text();
    let message = 'Export failed';
    try {
      message = JSON.parse(text).message || message;
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }

  const disposition = response.headers['content-disposition'] || '';
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainName = disposition.match(/filename="([^"]+)"/i);
  const filename = decodeURIComponent(utf8Name?.[1] || plainName?.[1] || 'constructops-report');

  return { blob: response.data, filename };
};

export const exportProjectReport = async (projectId, format) =>
  requestExport(`/export/projects/${projectId}/${format}`);

export const exportCompanyReport = async (format) => requestExport(`/export/company/${format}`);

export const saveBlobToDisk = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default API;

