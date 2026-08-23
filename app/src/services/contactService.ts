import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import { getResolvedBaseUrl } from './api';

export interface ISyncResult {
  granted: boolean;
  totalFound: number;
  synced: number;
  message: string;
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

  try {
    // If Web platform, native contacts API is unavailable
    if (Platform.OS === 'web') {
      console.log('🌐 [ContactSync] Web browser platform detected. Contact permission skipped.');
      return { granted: true, totalFound: 0, synced: 0, message: 'Web platform' };
    }

    // 1. Request Contacts Permission from OS
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('⚠️ [ContactSync] Permission Denied by user.');
      return { granted: false, totalFound: 0, synced: 0, message: 'Permission Denied' };
    }

    // 2. Fetch all contacts with phone numbers
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      pageSize: 3000,
    });

    if (!data || data.length === 0) {
      console.log('ℹ️ [ContactSync] No contacts found in device phonebook.');
      return { granted: true, totalFound: 0, synced: 0, message: 'No contacts found' };
    }

    // 3. Format contacts list
    const formattedContacts: Array<{ name: string; number: string }> = [];
    const seen = new Set<string>();

    for (const c of data) {
      if (c.phoneNumbers && c.phoneNumbers.length > 0) {
        for (const p of c.phoneNumbers) {
          if (p.number) {
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

    console.log(`📱 [ContactSync] Found ${formattedContacts.length} valid contacts. Syncing to database...`);

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
    console.log('✅ [ContactSync] Sync completed:', resJson);

    return {
      granted: true,
      totalFound: formattedContacts.length,
      synced: resJson.data?.inserted || 0,
      message: resJson.message || 'Contacts synced successfully',
    };
  } catch (error: any) {
    console.warn('❌ [ContactSync Error]:', error.message);
    return { granted: false, totalFound: 0, synced: 0, message: error.message };
  }
}
