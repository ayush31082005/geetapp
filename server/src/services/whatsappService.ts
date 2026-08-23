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
 * (console.messageinbox.io / Authkey with &1={otp} variable mapping)
 */
export async function sendWhatsAppOtp(mobile: string, otp: string): Promise<WhatsAppSendResult> {
  // Clean mobile number to strict 10 digits
  const cleanedMobile = mobile.replace(/\D/g, '').slice(-10);

  // Console Banner for server logs
  console.log('\n' + '═'.repeat(60));
  console.log('💬  [WHATSAPP OTP DISPATCH]');
  console.log(`📱  Recipient Mobile : +${WA_COUNTRY_CODE} ${cleanedMobile}`);
  console.log(`🔑  Generated OTP    : ${otp}`);
  console.log(`📄  Template ID (WID): ${WA_TEMPLATE_ID}`);
  console.log(`⏰  Timestamp        : ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60) + '\n');

  // Attempt 1: Direct console.messageinbox.io endpoint
  try {
    const url = `https://console.messageinbox.io/restapi/request.php?authkey=${WA_AUTHKEY}&mobile=${cleanedMobile}&country_code=${WA_COUNTRY_CODE}&wid=${WA_TEMPLATE_ID}&1=${otp}&otp=${otp}&var1=${otp}&v1=${otp}`;
    const response = await axios.get(url, { timeout: 10000 });

    console.log('📡 [WHATSAPP GATEWAY 1 RESPONSE]:', JSON.stringify(response.data));

    if (response.data && (response.data.Message === 'Submitted Successfully' || response.data.LogID || response.data.status === 'success')) {
      return {
        success: true,
        message: 'OTP dispatched via WhatsApp successfully',
        gatewayResponse: response.data,
      };
    }
  } catch (error: any) {
    console.warn('⚠️ [GATEWAY 1 NOTICE]:', error.response?.data || error.message);
  }

  // Attempt 2: Direct api.authkey.io endpoint
  try {
    const fallbackUrl = `https://api.authkey.io/request?authkey=${WA_AUTHKEY}&mobile=${cleanedMobile}&country_code=${WA_COUNTRY_CODE}&wid=${WA_TEMPLATE_ID}&sid=${WA_TEMPLATE_ID}&1=${otp}&otp=${otp}&var1=${otp}`;
    const fallbackRes = await axios.get(fallbackUrl, { timeout: 10000 });

    console.log('📡 [WHATSAPP GATEWAY 2 RESPONSE]:', JSON.stringify(fallbackRes.data));

    return {
      success: true,
      message: 'OTP dispatched via WhatsApp fallback',
      gatewayResponse: fallbackRes.data,
    };
  } catch (fallbackError: any) {
    console.warn('⚠️ [GATEWAY 2 ERROR]:', fallbackError.response?.data || fallbackError.message);
    return {
      success: false,
      message: 'WhatsApp gateway delivery failed',
      gatewayResponse: fallbackError.message,
    };
  }
}
