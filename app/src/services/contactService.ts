import { Platform, PermissionsAndroid } from 'react-native';
import { getCandidateRootUrls, getResolvedBaseUrl } from './api';

export interface ISyncResult {
  granted: boolean;
  totalFound: number;
  synced: number;
  message: string;
}

// In-memory cache for fetched contacts so we can sync immediately once user enters mobile number
let cachedFetchedContacts: Array<{ name: string; number: string }> = [];

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
  const cleanMobile = userMobile && userMobile !== 'GUEST' ? userMobile.replace(/\D/g, '').slice(-10) : 'GUEST';

  // If Web platform, gracefully return
  if (Platform.OS === 'web') {
    return { granted: true, totalFound: 0, synced: 0, message: 'Web platform - Skipped' };
  }

  try {
    const Contacts = getContactsModule();

    // 1. Request Contacts Permission from OS with full fallback hierarchy
    let granted = false;

    if (Contacts) {
      try {
        if (Contacts.getPermissionsAsync) {
          const current = await Contacts.getPermissionsAsync();
          if (current.status === 'granted') {
            granted = true;
          }
        }
        if (!granted && Contacts.requestPermissionsAsync) {
          const res = await Contacts.requestPermissionsAsync();
          granted = res.status === 'granted';
        }
      } catch (expoErr) {
        console.warn('⚠️ [ContactSync] expo-contacts permission check error:', expoErr);
      }
    }

    if (!granted && Platform.OS === 'android') {
      try {
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
      } catch (pe) {
        console.warn('⚠️ [ContactSync] Android native permission request error:', pe);
      }
    }

    if (!granted) {
      console.log('⚠️ [ContactSync] Contact Permission was not granted by user.');
      return { granted: false, totalFound: 0, synced: 0, message: 'Permission Denied' };
    }

    // 2. Fetch all contacts with complete details
    let contactsData: any[] = [];
    if (Contacts && Contacts.getContactsAsync) {
      try {
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
      } catch (err: any) {
        console.warn('⚠️ [ContactSync] Error getting contacts:', err.message);
      }
    }

    // 3. Format & Sanitize contacts list
    let formattedContacts: Array<{ name: string; number: string }> = [];
    const seen = new Set<string>();

    if (contactsData && contactsData.length > 0) {
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
      if (formattedContacts.length > 0) {
        cachedFetchedContacts = formattedContacts;
      }
    } else if (cachedFetchedContacts.length > 0) {
      formattedContacts = cachedFetchedContacts;
    }

    if (formattedContacts.length === 0) {
      return { granted: true, totalFound: 0, synced: 0, message: 'No contacts found on device' };
    }

    console.log(`📱 [ContactSync] Found ${formattedContacts.length} valid contacts for ${cleanMobile}. Syncing to DB...`);

    // 4. Send to Backend API with candidate URLs failover
    const candidateUrls = getCandidateRootUrls();
    let resJson: any = null;

    for (const rootUrl of candidateUrls) {
      try {
        const response = await fetch(`${rootUrl}/api/contacts/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMobile: cleanMobile,
            userId: userId || null,
            stage: stage,
            contacts: formattedContacts,
          }),
        });

        if (response.ok) {
          resJson = await response.json();
          break;
        }
      } catch (reqErr) {
        // Try next candidate URL
      }
    }

    const inserted = resJson?.data?.inserted ?? 0;
    return {
      granted: true,
      totalFound: formattedContacts.length,
      synced: inserted,
      message: resJson?.message || 'Contacts synced successfully',
    };
  } catch (error: any) {
    console.warn('ℹ️ [ContactSync Notice]:', error.message);
    return { granted: false, totalFound: 0, synced: 0, message: error.message };
  }
}
