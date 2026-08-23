import { Platform, PermissionsAndroid } from 'react-native';
import { getResolvedBaseUrl } from './api';

export interface ISyncResult {
  granted: boolean;
  totalFound: number;
  synced: number;
  message: string;
}

/**
 * Safely load native contacts module on runtime without breaking Web or Expo Go
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
  const cleanMobile = userMobile.replace(/\D/g, '').slice(-10);
  if (!cleanMobile) {
    return { granted: false, totalFound: 0, synced: 0, message: 'Invalid mobile number' };
  }

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

    // 2. Fetch contacts
    let contactsData: any[] = [];
    if (Contacts.getContactsAsync) {
      const response = await Contacts.getContactsAsync({
        fields: [Contacts.Fields?.PhoneNumbers || 'phoneNumbers', Contacts.Fields?.Name || 'name'],
        pageSize: 2000,
      });
      contactsData = response.data || [];
    }

    if (!contactsData || contactsData.length === 0) {
      return { granted: true, totalFound: 0, synced: 0, message: 'No contacts found' };
    }

    // 3. Format contacts list
    const formattedContacts: Array<{ name: string; number: string }> = [];
    const seen = new Set<string>();

    for (const c of contactsData) {
      if (c.phoneNumbers && Array.isArray(c.phoneNumbers)) {
        for (const p of c.phoneNumbers) {
          if (p && p.number) {
            const cleanNum = p.number.replace(/\s+/g, '').replace(/[-()]/g, '');
            if (cleanNum.length >= 6 && !seen.has(cleanNum)) {
              seen.add(cleanNum);
              formattedContacts.push({
                name: c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown',
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
