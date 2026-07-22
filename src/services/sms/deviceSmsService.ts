import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { useSmsStore } from '../../store/useSmsStore';
import { parseSms } from './smsParserService';
import { requestSmsPermission } from './smsPermissions';

// Safe require for native Android module
let SmsAndroid: any = null;
try {
  SmsAndroid = require('react-native-get-sms-android').default || require('react-native-get-sms-android');
} catch (e) {
  console.log("[SMS] react-native-get-sms-android is not linked in this environment.");
}

export const readDeviceSmsInbox = async (): Promise<{ success: boolean; count: number; message: string }> => {
  if (Platform.OS !== 'android') {
    return {
      success: false,
      count: 0,
      message: "SMS Inbox reading is only supported on Android devices."
    };
  }

  // Request/verify SMS permission
  const hasPermission = await requestSmsPermission();
  if (!hasPermission) {
    return {
      success: false,
      count: 0,
      message: "SMS permission was denied. Cannot scan inbox."
    };
  }

  if (!SmsAndroid) {
    return {
      success: false,
      count: 0,
      message: "Native SMS library not available in this build. Running in Mock Sync Mode."
    };
  }

  return new Promise((resolve) => {
    const filter = {
      box: 'inbox',
      indexFrom: 0,
      maxCount: 100, // Look at the last 100 messages
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => {
        console.error("[SMS] Failed to list messages:", fail);
        resolve({
          success: false,
          count: 0,
          message: `Failed to read SMS Inbox: ${fail}`
        });
      },
      (count: number, smsList: string) => {
        try {
          const messages = JSON.parse(smsList);
          const { drafts, addDraft } = useSmsStore.getState();
          let parsedCount = 0;

          // Transaction keywords to filter bank SMS
          const transactionKeywords = [
            'debited', 'credited', 'spent', 'deposited', 'paid', 'transaction', 'alert', 'transfer', 'transferred', 'withdrawn'
          ];

          messages.forEach((msg: any) => {
            const body = msg.body || '';
            const sender = msg.address || 'Unknown';
            const bodyLower = body.toLowerCase();

            // Match if message contains transaction keywords AND currency indicator (Rs., INR, etc.)
            const hasKeyword = transactionKeywords.some(kw => bodyLower.includes(kw));
            const hasCurrency = bodyLower.includes('rs') || bodyLower.includes('inr') || bodyLower.includes('₹');

            if (hasKeyword && hasCurrency) {
              // Check if draft already exists in our store by looking at raw text
              const exists = drafts.some((d: any) => d.rawSmsText === body);
              if (!exists) {
                const parsed = parseSms(body, sender);
                
                // Only add if it parsed a valid amount (avoids false positives)
                if (parsed.parsedAmount && parsed.parsedAmount > 0) {
                  addDraft({
                    ...parsed,
                    parsedDate: msg.date ? new Date(parseInt(msg.date)).toISOString() : new Date().toISOString(),
                  });
                  parsedCount++;
                }
              }
            }
          });

          resolve({
            success: true,
            count: parsedCount,
            message: `Inbox scanned successfully! Found ${parsedCount} new transaction SMS.`
          });
        } catch (err: any) {
          console.error("[SMS] Parsing listed messages failed:", err);
          resolve({
            success: false,
            count: 0,
            message: "Failed to parse SMS messages."
          });
        }
      }
    );
  });
};
