import { Platform, NativeModules } from 'react-native';

/**
 * Dynamically extract host IP from Metro / Expo runtime or Web
 */
const getDetectedHost = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return window.location.hostname || 'localhost';
  }

  try {
    const scriptURL: string = (NativeModules as any)?.SourceCode?.scriptURL || '';
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^:\/]+)/) || scriptURL.match(/exp:\/\/([^:\/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {}

// Fallback to current local machine WiFi IP
  return '192.168.1.41';
};

export const PRODUCTION_API_URL = 'https://geetapp-7u5h.onrender.com/api';
export const PRODUCTION_ROOT_URL = 'https://geetapp-7u5h.onrender.com';

/**
 * Returns prioritized list of candidate root URLs
 */
export const getCandidateRootUrls = (): string[] => {
  const detectedHost = getDetectedHost();
  if (Platform.OS === 'web') {
    return [
      `http://${detectedHost}:1000`,
      'http://localhost:1000',
      'http://127.0.0.1:1000',
      'http://192.168.1.41:1000',
      'https://geetapp-7u5h.onrender.com',
    ];
  }

  const list = [
    'http://192.168.1.41:1000',
    `http://${detectedHost}:1000`,
    'https://geetapp-7u5h.onrender.com',
    'http://localhost:1000',
    'http://10.208.157.130:1000',
    'http://10.0.2.2:1000',
  ];
  return Array.from(new Set(list.filter(Boolean)));
};

export const getResolvedBaseUrl = (): string => {
  const detectedHost = getDetectedHost();
  if (Platform.OS === 'web') {
    return `http://${detectedHost}:1000/api`;
  }
  return 'http://192.168.1.41:1000/api';
};

export interface SendOtpResponse {
  success: boolean;
  message: string;
  mobile?: string;
  otpLength?: number;
  devOtp?: string;
  whatsappDispatched?: boolean;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    uuid?: string;
    leadNumber?: string;
    mobile: string;
    name: string;
    email?: string | null;
  };
}

export interface DashboardDataResponse {
  user: {
    id: number;
    name: string;
    phone: string;
    email: string;
    avatar?: string | null;
    pan?: string;
    aadhaar?: string;
    employer?: string;
    salary?: number;
    creditScore?: number;
    creditRating?: string;
    creditDesc?: string;
    bank?: string;
    upi?: string;
  };
  loan: {
    id: string;
    leadId: string;
    status: string;
    amount: number;
    processingFee: number;
    gst: number;
    disbursed: number;
    dailyRate: number;
    startDate: string;
    dueDate: string;
    totalDays: number;
    elapsed: number;
    remaining: number;
    interest: number;
    outstanding: number;
    hasActiveLoan: boolean;
  };
  kyc?: {
    status: string;
    isComplete: boolean;
    completionPercent: number;
    title: string;
    desc: string;
    steps: Array<{
      title: string;
      desc: string;
      status: string;
      completed: boolean;
    }>;
  };
  notifications?: Array<{
    id: string | number;
    title: string;
    body: string;
    time: string;
    unread: boolean;
    category?: string;
  }>;
  history: Array<{
    id: string;
    amount: number;
    date: string;
    repaid: string;
    status: string;
    paid: number;
    duration: number;
  }>;
  transactions: Array<{
    label: string;
    sublabel?: string;
    amount: number;
    date: string;
    credit: boolean;
    category?: string;
  }>;
}

let cachedActiveRootUrl: string | null = null;

/**
 * Rapidly test server health with 1500ms timeout
 */
async function pingServer(rootUrl: string): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${rootUrl}/health`, { signal: controller.signal });
    clearTimeout(id);
    if (res.ok) return rootUrl;
    throw new Error('Not OK');
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * Discover the fastest responding server URL in parallel
 */
export async function getFastActiveRootUrl(): Promise<string> {
  if (cachedActiveRootUrl) {
    return cachedActiveRootUrl;
  }

  const candidates = getCandidateRootUrls();

  try {
    const fastest = await Promise.any(candidates.map((url) => pingServer(url)));
    console.log(`⚡ [API] Fastest active server discovered: ${fastest}`);
    cachedActiveRootUrl = fastest;
    return fastest;
  } catch (e) {
    // If probing fails, try first candidate or live render
    return candidates[0] || 'https://geetapp-7u5h.onrender.com';
  }
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Send OTP via WhatsApp API
 */
export async function requestWhatsAppOtp(mobileNumber: string): Promise<SendOtpResponse> {
  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
  const rootUrls = getCandidateRootUrls();

  // Try fast active server first
  try {
    const activeRoot = await getFastActiveRootUrl();
    const targetUrl = `${activeRoot}/api/auth/send-otp`;
    console.log(`[API] Sending OTP via active server: ${targetUrl}`);

    const response = await fetchWithTimeout(
      targetUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile }),
      },
      8000
    );

    const json = await response.json().catch(() => ({}));
    if (response.ok && json.success) {
      return json;
    }
    return {
      success: false,
      message: json.message || 'Failed to send OTP',
      ...json,
    };
  } catch (fastErr) {
    console.warn('⚡ Fast server attempt failed, trying fallback list...');
    cachedActiveRootUrl = null;
  }

  // Fallback iteration
  for (const root of rootUrls) {
    const targetUrl = `${root}/api/auth/send-otp`;
    try {
      const response = await fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanMobile }),
        },
        5000
      );

      const json = await response.json().catch(() => ({}));
      if (response.ok && json.success) {
        cachedActiveRootUrl = root;
        return json;
      }
      if (json.message) {
        return { success: false, message: json.message, ...json };
      }
    } catch (err) {}
  }

  throw new Error(`Cannot connect to Backend Server. Please check your internet connection.`);
}

/**
 * Verify OTP & Login
 */
export async function verifyWhatsAppOtp(mobileNumber: string, otp: string): Promise<VerifyOtpResponse> {
  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
  const cleanOtp = otp.trim();
  const rootUrls = getCandidateRootUrls();

  // Try fast active server first
  try {
    const activeRoot = await getFastActiveRootUrl();
    const targetUrl = `${activeRoot}/api/auth/verify-otp`;
    console.log(`[API] Verifying OTP at active server: ${targetUrl}`);

    const response = await fetchWithTimeout(
      targetUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, otp: cleanOtp }),
      },
      8000
    );

    const json = await response.json().catch(() => ({}));
    if (response.ok && json.success) {
      return json;
    }
    return {
      success: false,
      message: json.message || 'Invalid or expired OTP',
      ...json,
    };
  } catch (fastErr) {
    console.warn('⚡ Fast server attempt failed, trying fallback list...');
    cachedActiveRootUrl = null;
  }

  // Fallback iteration
  for (const root of rootUrls) {
    const targetUrl = `${root}/api/auth/verify-otp`;
    try {
      const response = await fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanMobile, otp: cleanOtp }),
        },
        5000
      );

      const json = await response.json().catch(() => ({}));
      if (response.ok && json.success) {
        cachedActiveRootUrl = root;
        return json;
      }
      if (json.message) {
        return { success: false, message: json.message, ...json };
      }
    } catch (err) {}
  }

  throw new Error(`Could not verify OTP. Unable to reach backend server.`);
}

/**
 * Fetch all disbursed loan & user details for a mobile number from MySQL
 */
export async function fetchDisbursedLoanDashboard(mobileNumber: string, token?: string): Promise<DashboardDataResponse | null> {
  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);

  try {
    const activeRoot = await getFastActiveRootUrl();
    const targetUrl = `${activeRoot}/api/loans/dashboard?mobile=${cleanMobile}`;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetchWithTimeout(targetUrl, { method: 'GET', headers }, 5000);
    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {}

  const rootUrls = getCandidateRootUrls();
  for (const root of rootUrls) {
    const targetUrl = `${root}/api/loans/dashboard?mobile=${cleanMobile}`;
    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetchWithTimeout(targetUrl, { method: 'GET', headers }, 3000);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          cachedActiveRootUrl = root;
          return json.data;
        }
      }
    } catch (err) {}
  }
  return null;
}
