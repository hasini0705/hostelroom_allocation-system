const API_BASE = '/api';

export function getToken() {
  return localStorage.getItem('hostel_token') || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('hostel_token', token);
  } else {
    localStorage.removeItem('hostel_token');
  }
}

export function getUser() {
  const user = localStorage.getItem('hostel_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem('hostel_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('hostel_user');
  }
}

export function clearAuth() {
  localStorage.removeItem('hostel_token');
  localStorage.removeItem('hostel_user');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Captcha
  getCaptcha: () => request('/captcha/new'),

  // Auth
  sendOtp: (email) => request('/auth/otp/send', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (email, otp) => request('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, otp }) }),
  registerStudent: (payload) => request('/auth/student/register', { method: 'POST', body: JSON.stringify(payload) }),
  loginStudent: (payload) => request('/auth/student/login', { method: 'POST', body: JSON.stringify(payload) }),
  loginWarden: (payload) => request('/auth/warden/login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (payload) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),
  logout: () => {
    clearAuth();
    return request('/auth/logout', { method: 'POST' }).catch(() => {});
  },

  // Hostel Public/Browsing
  getBlocks: () => request('/hostel/blocks'),
  getFloors: (blockId) => request(`/hostel/floors?blockId=${blockId}`),
  getRooms: (blockId, floorId, search) => {
    const params = new URLSearchParams();
    if (blockId) params.append('blockId', blockId);
    if (floorId) params.append('floorId', floorId);
    if (search) params.append('search', search);
    return request(`/hostel/rooms?${params.toString()}`);
  },
  getRoomDetails: (id) => request(`/hostel/rooms/${id}`),

  // Student Operations
  getStudentDashboard: () => request('/student/dashboard'),
  vacateRoom: () => request('/student/vacate', { method: 'POST' }),

  // Booking & Locks
  reserveBed: (bedId) => request('/booking/reserve', { method: 'POST', body: JSON.stringify({ bedId }) }),
  confirmBooking: (bedId) => request('/booking/confirm', { method: 'POST', body: JSON.stringify({ bedId }) }),
  cancelReservation: (bedId) => request('/booking/cancel', { method: 'POST', body: JSON.stringify({ bedId }) }),
  getCurrentHold: () => request('/booking/current-hold'),

  // Warden Operations
  getWardenDashboard: () => request('/warden/dashboard'),
  
  // Block management
  getWardenBlocks: () => request('/warden/blocks'),
  createBlock: (payload) => request('/warden/blocks', { method: 'POST', body: JSON.stringify(payload) }),
  updateBlock: (id, payload) => request(`/warden/blocks/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBlock: (id) => request(`/warden/blocks/${id}`, { method: 'DELETE' }),

  // Floor management
  createFloor: (payload) => request('/warden/floors', { method: 'POST', body: JSON.stringify(payload) }),

  // Room management
  getWardenRooms: (blockId, floorId, search) => {
    const params = new URLSearchParams();
    if (blockId) params.append('blockId', blockId);
    if (floorId) params.append('floorId', floorId);
    if (search) params.append('search', search);
    return request(`/warden/rooms?${params.toString()}`);
  },
  createRoom: (payload) => request('/warden/rooms', { method: 'POST', body: JSON.stringify(payload) }),
  updateRoom: (id, payload) => request(`/warden/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteRoom: (id) => request(`/warden/rooms/${id}`, { method: 'DELETE' }),

  // Bed management
  getWardenBeds: (roomId, status) => {
    const params = new URLSearchParams();
    if (roomId) params.append('roomId', roomId);
    if (status) params.append('status', status);
    return request(`/warden/beds?${params.toString()}`);
  },
  createBed: (payload) => request('/warden/beds', { method: 'POST', body: JSON.stringify(payload) }),
  updateBed: (id, payload) => request(`/warden/beds/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateBedStatus: (id, status) => request(`/warden/beds/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  releaseBedReservation: (id) => request(`/warden/beds/${id}/release`, { method: 'POST' }),
  deleteBed: (id) => request(`/warden/beds/${id}`, { method: 'DELETE' }),

  // Warden Notifications
  getWardenNotifications: () => request('/warden/notifications'),
  markNotificationRead: (id) => request(`/warden/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/warden/notifications/read-all', { method: 'PUT' }),
  clearReadNotifications: () => request('/warden/notifications/clear', { method: 'DELETE' }),

  // Student management
  getWardenStudents: (search) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return request(`/warden/students?${params.toString()}`);
  },
  getStudentDetails: (id) => request(`/warden/students/${id}`),
  updateStudentStatus: (id, isActive) => request(`/warden/students/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive }) }),

  // Booking management
  getWardenBookings: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.blockId) params.append('blockId', filters.blockId);
    if (filters.roomId) params.append('roomId', filters.roomId);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    return request(`/warden/bookings?${params.toString()}`);
  },
  cancelBooking: (id, reason) => request(`/warden/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Vacancy Report
  getVacancyReport: () => request('/warden/vacancy-report')
};
