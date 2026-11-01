import { Platform } from 'react-native';
import { SafeStorage } from './storage';

// Default backend URL for SunPower Spring Boot Backend
// On web/desktop: localhost:8081. On Android emulator: 10.0.2.2:8081.
const DEFAULT_API_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:8081/api' 
  : 'http://localhost:8081/api';

export const API_BASE_URL = (() => {
  try {
    // @ts-ignore – Expo injects EXPO_PUBLIC_* at build time
    const envUrl = process?.env?.EXPO_PUBLIC_API_URL;
    if (envUrl) return envUrl;
  } catch { /* ignore */ }
  return DEFAULT_API_URL;
})();

export const ELEVENLABS_DEFAULT_AGENT_ID = 'agent_4301m68j84sdfnzty10t96p2qt8y';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phone: string;
  role: 'CUSTOMER' | 'ADMIN' | 'SALES' | 'SURVEYOR' | 'INVENTORY' | 'INSTALLER' | 'SERVICE';
  customerId?: string;
}

export interface InstallationJob {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  city: string;
  address: string;
  capacity: number;
  systemType: string;
  scheduledAt: string;
  status: 'Assigned' | 'In Progress' | 'Paused' | 'Completed';
  progress: number;
  photos: { id: string; url: string; title: string; timestamp: string }[];
  checklist: { id: string; label: string; done: boolean }[];
  tests?: {
    generationKw?: number;
    dcVoltage?: number;
    acVoltage?: number;
    insulationMOhm?: number;
    earthingOhm?: number;
  };
}

class ApiClientService {
  private token: string | null = null;
  private isConnectedToBackend = false;

  constructor() {
    this.initToken();
  }

  private async initToken() {
    this.token = await SafeStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      SafeStorage.setItem('auth_token', token);
    } else {
      SafeStorage.deleteItem('auth_token');
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await SafeStorage.getItem('auth_token');
    }
    return this.token;
  }

  // Health check to determine if backend is online
  async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_BASE_URL}/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      this.isConnectedToBackend = res?.ok ?? false;
      return this.isConnectedToBackend;
    } catch {
      this.isConnectedToBackend = false;
      return false;
    }
  }

  // Generic request wrapper with auth and graceful fallback
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data?: T; error?: string; fromBackend: boolean }> {
    try {
      const token = await this.getToken();
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> || {}),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          errorMsg = parsed.message || parsed.error || errorMsg;
        } catch {
          if (errorText) errorMsg = errorText;
        }
        return { error: errorMsg, fromBackend: true };
      }

      const data = await response.json();
      this.isConnectedToBackend = true;
      return { data, fromBackend: true };
    } catch (err: any) {
      // Offline fallback
      return { error: err?.message || 'Network error', fromBackend: false };
    }
  }

  // 1. Auth: Login
  async login(username: string, password: string): Promise<{ success: boolean; user?: UserProfile; token?: string; error?: string }> {
    const res = await this.request<{ token: string; user: UserProfile }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res.fromBackend && res.data?.token) {
      this.setToken(res.data.token);
      await SafeStorage.setItem('user_profile', JSON.stringify(res.data.user));
      return { success: true, token: res.data.token, user: res.data.user };
    }

    // Graceful offline role authentication fallback
    const seedUsers: Record<string, UserProfile> = {
      'admin': { id: '11111111-1111-1111-1111-111111111101', username: 'admin', email: 'admin@sunflow360.com', fullName: 'Rajesh Nair', phone: '9820011223', role: 'ADMIN' },
      'sales': { id: '11111111-1111-1111-1111-111111111102', username: 'sales', email: 'sales@sunflow360.com', fullName: 'Priya Sharma', phone: '9820022334', role: 'SALES' },
      'surveyor': { id: '11111111-1111-1111-1111-111111111103', username: 'surveyor', email: 'surveyor@sunflow360.com', fullName: 'Vikram Joshi', phone: '9820033445', role: 'SURVEYOR' },
      'inventory': { id: '11111111-1111-1111-1111-111111111104', username: 'inventory', email: 'inventory@sunflow360.com', fullName: 'Anil Gaikwad', phone: '9820044556', role: 'INVENTORY' },
      'installer': { id: '11111111-1111-1111-1111-111111111105', username: 'installer', email: 'installer@sunflow360.com', fullName: 'Arjun Patil', phone: '9820055667', role: 'INSTALLER' },
      'service': { id: '11111111-1111-1111-1111-111111111106', username: 'service', email: 'service@sunflow360.com', fullName: 'Deepak Shinde', phone: '9820066778', role: 'SERVICE' },
      'rahul': { id: '11111111-1111-1111-1111-111111111107', username: 'rahul', email: 'rahul@gmail.com', fullName: 'Rahul Sharma', phone: '9876543210', role: 'CUSTOMER', customerId: '22222222-2222-2222-2222-222222222201' },
    };

    const matched = seedUsers[username.toLowerCase().trim()];
    if (matched) {
      const mockToken = `sunflow_jwt_${matched.id}`;
      this.setToken(mockToken);
      await SafeStorage.setItem('user_profile', JSON.stringify(matched));
      return { success: true, token: mockToken, user: matched };
    }

    return { success: false, error: res.error || 'Invalid username or password' };
  }

  // 2. Customer Phone & OTP login
  async customerLoginWithPhone(phone: string, otp: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    if (otp !== '123456' && !otp.startsWith('12')) {
      return { success: false, error: 'Incorrect verification code. Use demo code 123456.' };
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const demoCustomers: Record<string, UserProfile> = {
      '9876543210': { id: '22222222-2222-2222-2222-222222222201', username: 'rahul', email: 'rahul@gmail.com', fullName: 'Rahul Sharma', phone: '9876543210', role: 'CUSTOMER', customerId: 'CUST-001' },
      '9819001234': { id: '22222222-2222-2222-2222-222222222202', username: 'priya', email: 'priya@gmail.com', fullName: 'Priya Deshmukh', phone: '9819001234', role: 'CUSTOMER', customerId: 'CUST-002' },
      '9820011223': { id: '22222222-2222-2222-2222-222222222203', username: 'viraj', email: 'viraj@sunflow.in', fullName: 'Viraj', phone: '9820011223', role: 'CUSTOMER', customerId: 'CUST-003' },
    };

    const user = demoCustomers[cleanPhone] || {
      id: `cust_${Date.now()}`,
      username: `user_${cleanPhone}`,
      email: `${cleanPhone}@sunflow.in`,
      fullName: 'Solar Customer',
      phone: cleanPhone,
      role: 'CUSTOMER',
      customerId: `CUST-${cleanPhone.slice(-4)}`,
    };

    const mockToken = `customer_session_${user.id}`;
    this.setToken(mockToken);
    await SafeStorage.setItem('user_profile', JSON.stringify(user));
    await SafeStorage.setItem('user_data', JSON.stringify({
      id: user.id,
      name: user.fullName,
      phone: user.phone,
      customerId: user.customerId,
    }));

    return { success: true, user };
  }

  // 3. ElevenLabs Voice Session Token
  async getVoiceToken(): Promise<{ ephemeralToken: string; agentId: string; expiresAt: string }> {
    const res = await this.request<{ ephemeralToken: string; agentId: string; expiresAt: string }>('/v1/voice/token');
    if (res.data?.agentId) {
      return res.data;
    }
    return {
      ephemeralToken: `session_${Date.now()}`,
      agentId: ELEVENLABS_DEFAULT_AGENT_ID,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  // 4. ElevenLabs Voice Webhook / Save Lead
  async postVoiceWebhook(payload: {
    customerName?: string;
    customerPhone?: string;
    city?: string;
    capacityKw?: number;
    monthlyBill?: number;
    summary?: string;
    conversationId?: string;
  }): Promise<{ success: boolean; leadId?: string }> {
    const res = await this.request<{ status: string; leadId: string }>('/v1/voice/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      success: res.data?.status === 'SUCCESS',
      leadId: res.data?.leadId,
    };
  }

  // 5. Get Technician Installation Jobs
  async getTechnicianJobs(): Promise<InstallationJob[]> {
    const res = await this.request<InstallationJob[]>('/v1/installations');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }

    // Default Seed Jobs matching the Hackathon DB
    return [
      {
        id: 'INST-2024-001',
        reference: 'INS-40101',
        customerId: '22222222-2222-2222-2222-222222222201',
        customerName: 'Rahul Sharma',
        customerPhone: '9876543210',
        city: 'Pune',
        address: '14 Sunrise Bungalows, Baner Road',
        capacity: 5.0,
        systemType: 'On-Grid Residential',
        scheduledAt: new Date().toISOString(),
        status: 'In Progress',
        progress: 65,
        checklist: [
          { id: 'c1', label: 'Mounting structure anchored & torqued', done: true },
          { id: 'c2', label: '10x Mono-PERC solar modules fitted', done: true },
          { id: 'c3', label: '5kW Inverter mounted in shade', done: true },
          { id: 'c4', label: 'DC disconnect switch & surge protector installed', done: true },
          { id: 'c5', label: 'Earthing pit resistance measured (< 3.0 Ω)', done: false },
          { id: 'c6', label: 'Net-meter bidirectional sync test complete', done: false },
        ],
        photos: [
          { id: 'p1', url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80', title: 'Solar Array Completed', timestamp: '10:45 AM' },
          { id: 'p2', url: 'https://images.unsplash.com/photo-1548337138-e87d889cc369?auto=format&fit=crop&w=800&q=80', title: 'Inverter & DC Wiring', timestamp: '11:20 AM' },
        ],
        tests: {
          generationKw: 4.82,
          dcVoltage: 385,
          acVoltage: 232,
          insulationMOhm: 45,
          earthingOhm: 2.4,
        },
      },
      {
        id: 'INST-2024-002',
        reference: 'INS-40102',
        customerId: '22222222-2222-2222-2222-222222222202',
        customerName: 'Priya Deshmukh',
        customerPhone: '9819001234',
        city: 'Pune',
        address: 'Flat 402, Green Meadows, Kothrud',
        capacity: 3.3,
        systemType: 'On-Grid Residential',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        status: 'Assigned',
        progress: 20,
        checklist: [
          { id: 'c1', label: 'Site structural verification', done: true },
          { id: 'c2', label: 'Mounting rails delivered', done: false },
          { id: 'c3', label: 'Inverter wiring prepared', done: false },
        ],
        photos: [],
      },
      {
        id: 'INST-2024-003',
        reference: 'INS-40098',
        customerId: '22222222-2222-2222-2222-222222222203',
        customerName: 'Apex Manufacturing Ltd',
        customerPhone: '9833005544',
        city: 'Pune',
        address: 'Plot 45, MIDC Bhosari Industrial Area',
        capacity: 25.0,
        systemType: 'Commercial Grid-Tie',
        scheduledAt: new Date(Date.now() - 172800000).toISOString(),
        status: 'Completed',
        progress: 100,
        checklist: [
          { id: 'c1', label: 'Industrial mounting structure', done: true },
          { id: 'c2', label: 'HT Net-meter commissioned', done: true },
          { id: 'c3', label: 'MSEDCL inspection approved', done: true },
        ],
        photos: [
          { id: 'p3', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80', title: 'Commercial Rooftop Plant', timestamp: '2 days ago' },
        ],
      },
    ];
  }

  // 6. Save Mobile AI Conversation to Main CRM Database
  // This method is a convenience wrapper — the actual sync logic lives in crmSync.ts
  async saveMobileConversationToCRM(payload: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    city: string;
    language: string;
    messages: { role: 'agent' | 'user'; text: string; time: string }[];
    callDurationSeconds: number;
    conversationId: string;
  }): Promise<{ success: boolean; leadId?: string }> {
    // Try REST API first for live backend
    const res = await this.request<{ status: string; leadId: string; conversationId: string }>(
      '/v1/mobile/ai-conversation',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    if (res.fromBackend && res.data?.leadId) {
      return { success: true, leadId: res.data.leadId };
    }

    // If backend is offline, the crmSync.ts handles localStorage fallback
    return { success: false };
  }

  // Logout
  async logout() {
    this.setToken(null);
    await SafeStorage.deleteItem('user_profile');
    await SafeStorage.deleteItem('user_data');
  }
}

export const ApiClient = new ApiClientService();
