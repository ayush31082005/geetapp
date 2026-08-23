import { Platform, PermissionsAndroid } from 'react-native';
import { getResolvedBaseUrl } from './api';

export interface ISyncResult {
  granted: boolean;
  totalFound: number;
  synced: number;
  message: string;
}

/**
 * Safely load native contacts module on runtime
 */
function getContactsModule() {
  if (Platform.OS === 'web') return null;
  try {
    const mod = require('expo-contacts');
    return mod;
  } catch (e) {
    return null;
  }
}

/**
 * Request contacts permission from the device and sync all contacts to the MySQL backend
 */
export async function requestAndSyncContacts(
  userMobile: string,
  userId?: number | null,
  stage: 'APP_LAUNCH' | 'OTP_AGREE' | 'MANUAL' = 'OTP_AGREE'
): Promise<ISyncResult> {
  const cleanMobile = userMobile ? userMobile.replace(/\D/g, '').slice(-10) : 'GUEST';

  // If Web platform, skip native contact access gracefully
  if (Platform.OS === 'web') {
    return { granted: true, totalFound: 0, synced: 0, message: 'Web platform - Skipped' };
  }

  try {
    const Contacts = getContactsModule();

    if (!Contacts) {
      console.log('ℹ️ [ContactSync] Native contacts module not available in this environment.');
      return { granted: true, totalFound: 0, synced: 0, message: 'Module unavailable' };
    }

    // 1. Request Contacts Permission from OS
    let granted = false;
    if (Contacts.requestPermissionsAsync) {
      const { status } = await Contacts.requestPermissionsAsync();
      granted = status === 'granted';
    } else if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'GeetPay Contacts Permission',
          message: 'GeetPay requires access to contacts for credit risk verification & loan processing.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      granted = result === PermissionsAndroid.RESULTS.GRANTED;
    }

    if (!granted) {
      console.log('⚠️ [ContactSync] Contact Permission was Denied by user.');
      return { granted: false, totalFound: 0, synced: 0, message: 'Permission Denied' };
    }

    // 2. Fetch all contacts with complete details
    let contactsData: any[] = [];
    if (Contacts.getContactsAsync) {
      const response = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields?.PhoneNumbers || 'phoneNumbers',
          Contacts.Fields?.Name || 'name',
          Contacts.Fields?.FirstName || 'firstName',
          Contacts.Fields?.LastName || 'lastName',
          Contacts.Fields?.Company || 'company',
        ],
        pageSize: 5000,
      });
      contactsData = response.data || [];
    }

    if (!contactsData || contactsData.length === 0) {
      return { granted: true, totalFound: 0, synced: 0, message: 'No contacts found' };
    }

    // 3. Format & Sanitize contacts list
    const formattedContacts: Array<{ name: string; number: string }> = [];
    const seen = new Set<string>();

    for (const c of contactsData) {
      if (c.phoneNumbers && Array.isArray(c.phoneNumbers)) {
        // Extract Real Full Name
        let nameStr = (c.name || '').trim();
        if (!nameStr || nameStr.toLowerCase() === 'null' || nameStr.toLowerCase() === 'undefined') {
          nameStr = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').trim();
        }
        if (!nameStr && c.company) {
          nameStr = String(c.company).trim();
        }
        if (!nameStr && c.nickname) {
          nameStr = String(c.nickname).trim();
        }

        for (const p of c.phoneNumbers) {
          if (p && p.number) {
            let rawNum = p.number.replace(/\s+/g, '').replace(/[-()]/g, '');

            // Clean number format
            let cleanNum = rawNum;
            if (cleanNum.startsWith('+91')) {
              cleanNum = cleanNum.slice(3);
            } else if (cleanNum.startsWith('0091')) {
              cleanNum = cleanNum.slice(4);
            } else if (cleanNum.startsWith('0') && cleanNum.length === 11) {
              cleanNum = cleanNum.slice(1);
            }

            if (cleanNum.length >= 6 && !seen.has(cleanNum)) {
              seen.add(cleanNum);

              // If name was blank or was just the raw number, fallback to friendly name
              const finalName = (!nameStr || nameStr === rawNum || nameStr === cleanNum)
                ? 'Contact ' + cleanNum.slice(-4)
                : nameStr;

              formattedContacts.push({
                name: finalName,
                number: cleanNum,
              });
            }
          }
        }
      }
    }

    if (formattedContacts.length === 0) {
      return { granted: true, totalFound: 0, synced: 0, message: 'No valid phone numbers' };
    }

    console.log(`📱 [ContactSync] Found ${formattedContacts.length} valid contacts with proper names. Syncing to DB...`);

    // 4. Send to Backend API
    const baseUrl = getResolvedBaseUrl();
    const response = await fetch(`${baseUrl}/contacts/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMobile: cleanMobile,
        userId: userId || null,
        stage: stage,
        contacts: formattedContacts,
      }),
    });

    const resJson = await response.json();
    return {
      granted: true,
      totalFound: formattedContacts.length,
      synced: resJson.data?.inserted || 0,
      message: resJson.message || 'Contacts synced successfully',
    };
  } catch (error: any) {
    console.warn('ℹ️ [ContactSync Notice]:', error.message);
    return { granted: false, totalFound: 0, synced: 0, message: error.message };
  }
}
