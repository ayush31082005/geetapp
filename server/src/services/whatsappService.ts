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
  // Clean mobile number (strip +91, spaces, dashes)
  const cleanedMobile = mobile.replace(/\D/g, '').slice(-10);

  // 1. Console Banner for Visibility
  console.log('\n' + '═'.repeat(60));
  console.log('💬  [WHATSAPP OTP DISPATCH]');
  console.log(`📱  Recipient Mobile : +${WA_COUNTRY_CODE} ${cleanedMobile}`);
  console.log(`🔑  Generated OTP    : ${otp}`);
  console.log(`📄  Template ID (WID): ${WA_TEMPLATE_ID}`);
  console.log(`⏰  Timestamp        : ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60) + '\n');

  try {
    // Primary URL with exact variable mapping for template 44556
    const url = `https://console.messageinbox.io/restapi/request.php?authkey=${WA_AUTHKEY}&mobile=${cleanedMobile}&country_code=${WA_COUNTRY_CODE}&wid=${WA_TEMPLATE_ID}&1=${otp}`;

    const response = await axios.get(url, { timeout: 10000 });

    console.log('📡 [WHATSAPP GATEWAY RESPONSE]:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      message: 'OTP dispatched via WhatsApp successfully',
      gatewayResponse: response.data,
    };
  } catch (error: any) {
    console.error('⚠️ [WHATSAPP GATEWAY NOTICE]: messageinbox.io call failed, trying fallback:', error.response?.data || error.message);

    // Secondary fallback URL format
    try {
      const fallbackUrl = `https://api.authkey.io/request?authkey=${WA_AUTHKEY}&mobile=${cleanedMobile}&country_code=${WA_COUNTRY_CODE}&wid=${WA_TEMPLATE_ID}&sid=${WA_TEMPLATE_ID}&1=${otp}&otp=${otp}`;
      const fallbackRes = await axios.get(fallbackUrl, { timeout: 10000 });
      console.log('📡 [WHATSAPP FALLBACK RESPONSE]:', JSON.stringify(fallbackRes.data, null, 2));
      return {
        success: true,
        message: 'OTP dispatched via WhatsApp fallback successfully',
        gatewayResponse: fallbackRes.data,
      };
    } catch (fallbackError: any) {
      console.warn('⚠️ [WHATSAPP GATEWAY WARNING]:', fallbackError.message);
      return {
        success: false,
        message: 'WhatsApp gateway error',
        gatewayResponse: error.response?.data || error.message,
      };
    }
  }
}
