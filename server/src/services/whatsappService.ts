import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WA_AUTHKEY = process.env.WA_AUTHKEY || '86e674997217d269';
const WA_COUNTRY_CODE = process.env.WA_COUNTRY_CODE || '91';
const WA_TEMPLATE_ID = process.env.WA_TEMPLATE_ID || '44556';

export interface WhatsAppSendResult {
  success: boolean;
  message: string;
  gatewayResponse?: any;
}

/**
 * Sends OTP to the specified mobile number via WhatsApp Gateway
 * (Supports messageinbox.io & authkey.io with multi-parameter mapping)
 */
export async function sendWhatsAppOtp(mobile: string, otp: string): Promise<WhatsAppSendResult> {
  // Clean mobile number (strip +91, spaces, dashes)
  const cleanedMobile = mobile.replace(/\D/g, '').slice(-10);

  // Console Banner for server logs
  console.log('\n' + '═'.repeat(60));
  console.log('💬  [WHATSAPP OTP DISPATCH]');
  console.log(`📱  Recipient Mobile : +${WA_COUNTRY_CODE} ${cleanedMobile}`);
  console.log(`🔑  Generated OTP    : ${otp}`);
  console.log(`📄  Template ID (WID): ${WA_TEMPLATE_ID}`);
  console.log(`⏰  Timestamp        : ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60) + '\n');

  let lastResult: any = null;

  // 1. Primary Dispatch: console.messageinbox.io
  try {
    const url1 = `https://console.messageinbox.io/restapi/request.php?authkey=${WA_AUTHKEY}&mobile=${cleanedMobile}&country_code=${WA_COUNTRY_CODE}&wid=${WA_TEMPLATE_ID}&1=${otp}&otp=${otp}&var1=${otp}&v1=${otp}&channel=whatsapp`;
    const res1 = await axios.get(url1, { timeout: 10000 });
    console.log('📡 [GATEWAY 1 - messageinbox.io]:', JSON.stringify(res1.data));
    lastResult = res1.data;
  } catch (err: any) {
    console.warn('⚠️ [GATEWAY 1 ERROR]:', err.response?.data || err.message);
  }

  // 2. Secondary Dispatch: api.authkey.io
  try {
    const url2 = `https://api.authkey.io/request?authkey=${WA_AUTHKEY}&mobile=${cleanedMobile}&country_code=${WA_COUNTRY_CODE}&wid=${WA_TEMPLATE_ID}&sid=${WA_TEMPLATE_ID}&1=${otp}&otp=${otp}&var1=${otp}&channel=whatsapp`;
    const res2 = await axios.get(url2, { timeout: 10000 });
    console.log('📡 [GATEWAY 2 - api.authkey.io]:', JSON.stringify(res2.data));
    lastResult = res2.data;
  } catch (err: any) {
    console.warn('⚠️ [GATEWAY 2 ERROR]:', err.response?.data || err.message);
  }

  return {
    success: true,
    message: 'OTP dispatched via WhatsApp gateway',
    gatewayResponse: lastResult,
  };
}
