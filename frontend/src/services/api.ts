import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  refreshToken: () => api.post('/auth/refresh')
};

// Piscine API
export const piscineApi = {
  getPrices: () => api.get('/piscine/prices'),
  createTicket: (data: { type: string; quantity: number; payment_method: string; payment_operator?: string; payment_reference?: string }) =>
    api.post('/piscine/tickets', data),
  getTickets: (params?: Record<string, string>) =>
    api.get('/piscine/tickets', { params }),
  getTicketStats: (date?: string) =>
    api.get('/piscine/tickets/stats', { params: { date } }),
  updatePrices: (data: {
    ticket_adulte?: number;
    ticket_enfant?: number;
    abonnement_mensuel?: number;
    abonnement_trimestriel?: number;
    abonnement_annuel?: number;
  }) => api.put('/piscine/prices', data),
  createSubscription: (data: {
    client_name: string;
    client_phone?: string;
    type: string;
    start_date: string;
  }) => api.post('/piscine/subscriptions', data),
  getSubscriptions: (params?: Record<string, string>) =>
    api.get('/piscine/subscriptions', { params }),
  getSubscription: (id: number) => api.get(`/piscine/subscriptions/${id}`),
  cancelSubscription: (id: number) => api.put(`/piscine/subscriptions/${id}/cancel`),
  checkSubscription: (phone: string) => api.get(`/piscine/subscriptions/check/${phone}`),
  // Incidents
  createIncident: (data: {
    title: string;
    description: string;
    severity?: string;
    incident_date: string;
    incident_time?: string;
    location?: string;
    persons_involved?: string;
    actions_taken?: string;
    photo_url?: string;
  }) => api.post('/piscine/incidents', data),
  getIncidents: (params?: Record<string, string>) => api.get('/piscine/incidents', { params }),
  updateIncident: (id: number, data: { status?: string; actions_taken?: string }) =>
    api.put(`/piscine/incidents/${id}`, data)
};

// Restaurant API
export const restaurantApi = {
  getMenu: (params?: { category?: string; available_only?: string }) =>
    api.get('/restaurant/menu', { params }),
  createMenuItem: (data: {
    name: string;
    category: string;
    price: number;
    description?: string;
  }) => api.post('/restaurant/menu', data),
  updateMenuItem: (id: number, data: Partial<{
    name: string;
    category: string;
    price: number;
    description: string;
    is_available: boolean;
  }>) => api.put(`/restaurant/menu/${id}`, data),
  deleteMenuItem: (id: number) => api.delete(`/restaurant/menu/${id}`),
  toggleAvailability: (id: number) => api.put(`/restaurant/menu/${id}/availability`),
  createSale: (data: {
    items: Array<{ menu_item_id: number; quantity: number }>;
    table_number?: string;
    room_number?: string;
  }) => api.post('/restaurant/sales', data),
  getOpenSales: () => api.get('/restaurant/sales/open'),
  closeSale: (id: number, data: {
    payment_method: string;
    payment_operator?: string;
    payment_reference?: string;
  }) => api.put(`/restaurant/sales/${id}/close`, data),
  getSales: (params?: Record<string, string>) =>
    api.get('/restaurant/sales', { params }),
  getSale: (id: number) => api.get(`/restaurant/sales/${id}`),
  getSaleStats: (date?: string) =>
    api.get('/restaurant/sales/stats', { params: { date } }),
  getRoomBill: (roomNumber: string) =>
    api.get(`/restaurant/bills/room/${roomNumber}`),
  closeRoomSales: (roomNumber: string, paymentMethod: string) =>
    api.put(`/restaurant/bills/room/${roomNumber}/close`, { payment_method: paymentMethod })
};

// Hotel API
export const hotelApi = {
  getRooms: (params?: { status?: string; type?: string }) =>
    api.get('/hotel/rooms', { params }),
  getRoom: (id: number) => api.get(`/hotel/rooms/${id}`),
  createRoom: (data: {
    number: string;
    type: string;
    capacity?: number;
    price_per_night: number;
  }) => api.post('/hotel/rooms', data),
  updateRoom: (id: number, data: {
    number?: string;
    price_per_night?: number;
    capacity?: number;
    type?: string;
  }) => api.put(`/hotel/rooms/${id}`, data),
  updateRoomStatus: (id: number, status: string) =>
    api.put(`/hotel/rooms/${id}/status`, { status }),
  getAvailableRooms: (checkIn: string, checkOut: string, type?: string) =>
    api.get('/hotel/rooms/available', { params: { check_in: checkIn, check_out: checkOut, type } }),
  createReservation: (data: {
    room_id: number;
    client_name: string;
    client_phone?: string;
    client_email?: string;
    check_in: string;
    check_out: string;
    deposit_paid?: number;
    notes?: string;
    cni_number?: string;
    origin_city?: string;
    destination_city?: string;
    payment_operator?: string;
    payment_reference?: string;
  }) => api.post('/hotel/reservations', data),
  getReservations: (params?: Record<string, string>) =>
    api.get('/hotel/reservations', { params }),
  getReservation: (id: number) => api.get(`/hotel/reservations/${id}`),
  updateReservation: (id: number, data: Record<string, unknown>) =>
    api.put(`/hotel/reservations/${id}`, data),
  checkIn: (id: number) => api.put(`/hotel/reservations/${id}/checkin`),
  checkOut: (id: number, data?: { payment_amount?: number; payment_notes?: string }) =>
    api.put(`/hotel/reservations/${id}/checkout`, data || {}),
  cancelReservation: (id: number) => api.put(`/hotel/reservations/${id}/cancel`),
  getStats: () => api.get('/hotel/stats'),
  getFullReceipt: (id: number) => api.get(`/hotel/reservations/${id}/full-receipt`)
};

// Events API
export const eventsApi = {
  getSpaces: () => api.get('/events/spaces'),
  createEvent: (data: {
    name: string;
    client_name: string;
    client_phone?: string;
    client_email?: string;
    event_date: string;
    event_time?: string;
    end_date?: string;
    space: string;
    guest_count?: number;
    description?: string;
    price?: number;
    deposit_paid?: number;
  }) => api.post('/events', data),
  getEvents: (params?: Record<string, string>) =>
    api.get('/events', { params }),
  getCalendar: (month?: number, year?: number) =>
    api.get('/events/calendar', { params: { month, year } }),
  getEvent: (id: number) => api.get(`/events/${id}`),
  updateEvent: (id: number, data: Record<string, unknown>) =>
    api.put(`/events/${id}`, data),
  updateEventStatus: (id: number, status: string) =>
    api.put(`/events/${id}/status`, { status }),
  createQuote: (eventId: number, data: {
    items: Array<{ description: string; quantity: number; unit_price: number }>;
    deposit_required?: number;
    valid_until?: string;
    notes?: string;
  }) => api.post(`/events/${eventId}/quotes`, data),
  getQuotes: (eventId: number) => api.get(`/events/${eventId}/quotes`),
  updateQuote: (id: number, data: Record<string, unknown>) =>
    api.put(`/events/quotes/${id}`, data),
  recordPayment: (id: number, amount: number) =>
    api.put(`/events/quotes/${id}/payment`, { amount })
};

// Caisse API
export const caisseApi = {
  closeCashRegister: (data: {
    module: string;
    actual_amount: number;
    opening_amount?: number;
    notes?: string;
    employee_id?: number;
  }) => api.post('/caisse/close', data),
  getCashRegisters: (params?: Record<string, string>) =>
    api.get('/caisse', { params }),
  getCashRegister: (id: number) => api.get(`/caisse/${id}`),
  validateCashRegister: (id: number, status: string, notes?: string) =>
    api.put(`/caisse/${id}/validate`, { status, notes }),
  getPendingCashRegisters: () => api.get('/caisse/pending'),
  getExpectedAmount: (module: string, employeeId?: number) =>
    api.get('/caisse/expected', { params: { module, employee_id: employeeId } }),
  getCaisseStats: (params?: { start_date?: string; end_date?: string }) =>
    api.get('/caisse/stats', { params }),
  getEmployeesByModule: (module: string) =>
    api.get(`/caisse/employees/${module}`)
};

// Receipts API
export const receiptsApi = {
  getReceipts: (params?: Record<string, string>) =>
    api.get('/receipts', { params }),
  getReceipt: (id: number) => api.get(`/receipts/${id}`),
  getReceiptByCashRegister: (cashRegisterId: number) =>
    api.get(`/receipts/by-cash-register/${cashRegisterId}`),
  getReceiptForPrint: (id: number) => api.get(`/receipts/${id}/print`)
};

// Dashboard API
export const dashboardApi = {
  getDashboard: () => api.get('/dashboard'),
  getReports: (startDate: string, endDate: string, module?: string) =>
    api.get('/dashboard/reports', { params: { start_date: startDate, end_date: endDate, module } }),
  getAuditLogs: (params?: Record<string, string>) =>
    api.get('/dashboard/audit', { params })
};

// Users API
export const usersApi = {
  getUsers: (params?: Record<string, string>) =>
    api.get('/users', { params }),
  getUser: (id: number) => api.get(`/users/${id}`),
  createUser: (data: {
    username: string;
    password: string;
    full_name: string;
    role: string;
  }) => api.post('/users', data),
  updateUser: (id: number, data: { full_name?: string; role?: string; is_active?: boolean }) =>
    api.put(`/users/${id}`, data),
  resetPassword: (id: number, newPassword: string) =>
    api.put(`/users/${id}/password`, { new_password: newPassword }),
  toggleActive: (id: number) => api.put(`/users/${id}/toggle-active`),
  getRoles: () => api.get('/users/roles')
};

// Expenses API
export const expensesApi = {
  getExpenses: (params?: Record<string, string>) =>
    api.get('/expenses', { params }),
  getCategories: () => api.get('/expenses/categories'),
  getExpenseStats: (month?: number, year?: number) =>
    api.get('/expenses/stats', { params: { month, year } }),
  createExpense: (data: {
    category: string;
    description: string;
    amount: number;
    payment_method?: string;
    reference?: string;
    expense_date?: string;
    notes?: string;
  }) => api.post('/expenses', data),
  updateExpense: (id: number, data: Record<string, unknown>) =>
    api.put(`/expenses/${id}`, data)
};

// Reports API
export const reportsApi = {
  getTransactions: (params?: {
    start_date?: string;
    end_date?: string;
    module?: string;
    user_id?: number;
    payment_method?: string;
    min_amount?: number;
    max_amount?: number;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }) => api.get('/reports/transactions', { params }),
  getSummary: (params?: {
    start_date?: string;
    end_date?: string;
    group_by?: string;
  }) => api.get('/reports/summary', { params }),
  getUsers: () => api.get('/reports/users'),
  // Layouts
  getLayouts: () => api.get('/reports/layouts'),
  createLayout: (data: {
    layout_name: string;
    columns: string[];
    filters?: Record<string, unknown>;
    sort_by?: string;
    sort_order?: string;
    rows_per_page?: number;
    is_default?: boolean;
  }) => api.post('/reports/layouts', data),
  updateLayout: (id: number, data: Record<string, unknown>) =>
    api.put(`/reports/layouts/${id}`, data),
  deleteLayout: (id: number) => api.delete(`/reports/layouts/${id}`)
};

// Employees API
export const employeesApi = {
  getEmployees: (params?: Record<string, string>) =>
    api.get('/employees', { params }),
  getEmployee: (id: number) => api.get(`/employees/${id}`),
  getPositions: () => api.get('/employees/positions'),
  createEmployee: (data: {
    full_name: string;
    position: string;
    phone?: string;
    email?: string;
    hire_date?: string;
    base_salary?: number;
    contract_type?: string;
    end_contract_date?: string;
    id_type?: string;
    id_number?: string;
    id_issue_date?: string;
    id_expiry_date?: string;
    id_issued_by?: string;
    birth_date?: string;
    birth_place?: string;
    gender?: string;
    nationality?: string;
    address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    marital_status?: string;
    dependents_count?: number;
    notes?: string;
  }) => api.post('/employees', data),
  updateEmployee: (id: number, data: Record<string, unknown>) =>
    api.put(`/employees/${id}`, data),
  // Payroll
  getPayrolls: (params?: Record<string, string>) =>
    api.get('/employees/payroll', { params }),
  getPayrollStats: (month?: number, year?: number) =>
    api.get('/employees/payroll/stats', { params: { month, year } }),
  createPayroll: (data: {
    employee_id: number;
    period_month: number;
    period_year: number;
    bonus?: number;
    deductions?: number;
    notes?: string;
  }) => api.post('/employees/payroll', data),
  payPayroll: (id: number, data: {
    payment_method?: string;
    payment_date?: string;
    notes?: string;
  }) => api.put(`/employees/payroll/${id}/pay`, data),
  cancelPayroll: (id: number) => api.delete(`/employees/payroll/${id}`)
};

export default api;

// Lavage Auto API
export const lavageApi = {
  getVehicleTypes: () => api.get('/lavage/vehicle-types'),
  createVehicleType: (data: { name: string; price: number }) =>
    api.post('/lavage/vehicle-types', data),
  updateVehicleType: (id: number, data: { name?: string; price?: number; is_active?: boolean }) =>
    api.put(`/lavage/vehicle-types/${id}`, data),
  deleteVehicleType: (id: number) => api.delete(`/lavage/vehicle-types/${id}`),
  createCarWash: (data: {
    vehicle_type_id: number; plate_number?: string; customer_name?: string;
    customer_phone?: string; payment_method?: string; payment_operator?: string;
    payment_reference?: string; tab_id?: number; notes?: string;
  }) => api.post('/lavage/washes', data),
  getCarWashes: (params?: { date?: string; start_date?: string; end_date?: string }) =>
    api.get('/lavage/washes', { params }),
  getStats: () => api.get('/lavage/stats')
};

// Customer Tabs API (cross-service billing)
export const tabsApi = {
  createTab: (data: { customer_name: string; customer_info?: string; notes?: string }) =>
    api.post('/tabs', data),
  getOpenTabs: () => api.get('/tabs/open'),
  getTab: (id: number) => api.get(`/tabs/${id}`),
  addItemToTab: (id: number, data: {
    service_type: string; item_name: string; quantity: number;
    unit_price: number; reference_id?: number; notes?: string;
  }) => api.post(`/tabs/${id}/items`, data),
  closeTab: (id: number, data: {
    payment_method: string; payment_operator?: string; payment_reference?: string;
  }) => api.put(`/tabs/${id}/close`, data),
  getTabs: (params?: { date?: string; status?: string; start_date?: string; end_date?: string }) =>
    api.get('/tabs', { params })
};

// Maquis API
export const maquisApi = {
  getStats: () => api.get('/maquis/stats'),
  getProducts: (params?: { category?: string; active_only?: string }) =>
    api.get('/maquis/products', { params }),
  createProduct: (data: {
    name: string; category: string; sell_price: number;
    buy_price?: number; unit?: string; min_stock?: number; description?: string;
  }) => api.post('/maquis/products', data),
  updateProduct: (id: number, data: Record<string, unknown>) => api.put(`/maquis/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/maquis/products/${id}`),
  createOrder: (data: {
    items: Array<{ product_id: number; quantity: number }>;
    tab_id?: number; payment_method?: string; payment_operator?: string;
    payment_reference?: string; table_number?: string; notes?: string;
  }) => api.post('/maquis/orders', data),
  getStock: () => api.get('/maquis/stock'),
  getStockMovements: (params?: Record<string, string>) => api.get('/maquis/stock/movements', { params }),
  addStock: (data: {
    supplier_id?: number;
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>;
    payment_method?: string; notes?: string; purchase_date?: string;
  }) => api.post('/maquis/stock/add', data),
  getPurchases: () => api.get('/maquis/purchases'),
  getSuppliers: () => api.get('/maquis/suppliers'),
  createSupplier: (data: { name: string; contact?: string; phone?: string; address?: string }) =>
    api.post('/maquis/suppliers', data),
  updateSupplier: (id: number, data: Record<string, unknown>) => api.put(`/maquis/suppliers/${id}`, data)
};

// Superette API
export const superetteApi = {
  getStats: () => api.get('/superette/stats'),
  getProducts: (params?: { category?: string; active_only?: string; search?: string }) =>
    api.get('/superette/products', { params }),
  createProduct: (data: {
    name: string; category: string; sell_price: number;
    buy_price?: number; unit?: string; min_stock?: number; description?: string;
  }) => api.post('/superette/products', data),
  updateProduct: (id: number, data: Record<string, unknown>) => api.put(`/superette/products/${id}`, data),
  deleteProduct: (id: number) => api.delete(`/superette/products/${id}`),
  createSale: (data: {
    items: Array<{ product_id: number; quantity: number }>;
    tab_id?: number; payment_method?: string; payment_operator?: string;
    payment_reference?: string; notes?: string;
  }) => api.post('/superette/sales', data),
  getStock: () => api.get('/superette/stock'),
  getStockMovements: (params?: Record<string, string>) => api.get('/superette/stock/movements', { params }),
  adjustStock: (data: { product_id: number; new_quantity: number; reason?: string }) =>
    api.post('/superette/stock/adjust', data),
  addStock: (data: {
    supplier_id?: number;
    items: Array<{ product_id: number; quantity: number; unit_price?: number }>;
    payment_method?: string; notes?: string; purchase_date?: string;
  }) => api.post('/superette/stock/add', data),
  getPurchases: () => api.get('/superette/purchases'),
  getSuppliers: () => api.get('/superette/suppliers'),
  createSupplier: (data: { name: string; contact?: string; phone?: string; address?: string }) =>
    api.post('/superette/suppliers', data),
  updateSupplier: (id: number, data: Record<string, unknown>) => api.put(`/superette/suppliers/${id}`, data)
};
