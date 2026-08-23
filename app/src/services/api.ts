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
  return '10.208.157.130';
};

/**
 * Returns prioritized list of candidate root URLs (port 1000)
 */
export const getCandidateRootUrls = (): string[] => {
  const detectedHost = getDetectedHost();
  const list = [
    `http://${detectedHost}:1000`,
    'http://10.208.157.130:1000',
    'http://localhost:1000',
    'http://10.0.2.2:1000',
  ];
  return Array.from(new Set(list));
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

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 4000): Promise<Response> {
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

  let lastError = '';

  for (const root of rootUrls) {
    const targetUrl = `${root}/api/auth/send-otp`;
    try {
      console.log(`[API] Sending OTP to: ${targetUrl}`);
      const response = await fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ mobile: cleanMobile }),
        },
        5000
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[API] Connection to ${targetUrl} failed: ${err.message}`);
    }
  }

  throw new Error(`Cannot connect to Backend Server on Port 1000. (IP: 10.208.157.130:1000). Error: ${lastError}`);
}

/**
 * Verify OTP & Login
 */
export async function verifyWhatsAppOtp(mobileNumber: string, otp: string): Promise<VerifyOtpResponse> {
  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
  const cleanOtp = otp.trim();
  const rootUrls = getCandidateRootUrls();

  let lastError = '';

  for (const root of rootUrls) {
    const targetUrl = `${root}/api/auth/verify-otp`;
    try {
      console.log(`[API] Verifying OTP at: ${targetUrl}`);
      const response = await fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ mobile: cleanMobile, otp: cleanOtp }),
        },
        5000
      );

      return await response.json();
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[API] Verify to ${targetUrl} failed: ${err.message}`);
    }
  }

  throw new Error(`Could not verify OTP. Unable to reach backend server. Error: ${lastError}`);
}

/**
 * Fetch all disbursed loan & user details for a mobile number from MySQL
 */
export async function fetchDisbursedLoanDashboard(mobileNumber: string, token?: string): Promise<DashboardDataResponse | null> {
  const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
  const rootUrls = getCandidateRootUrls();

  for (const root of rootUrls) {
    const targetUrl = `${root}/api/loans/dashboard?mobile=${cleanMobile}`;
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetchWithTimeout(targetUrl, { method: 'GET', headers }, 4000);
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          console.log(`[API] Successfully loaded disbursed loan data for: +91 ${cleanMobile}`);
          return json.data;
        }
      }
    } catch (err) {}
  }
  return null;
}
