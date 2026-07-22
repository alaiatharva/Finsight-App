import { PermissionsAndroid, Platform, Alert } from 'react-native';

export const requestSmsPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // Auto-grant/simulate on iOS and Web to allow mock testing
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Tracking Permission',
        message: 'FinSight needs access to read your SMS to automatically track your bank transactions.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    // Fallback dialogue for environments where permission is denied/unavailable (e.g. Expo Go)
    return new Promise((resolve) => {
      Alert.alert(
        'SMS Permission Request',
        'Real SMS permission could not be granted (commonly because the app is running under Expo Go or permissions were denied). Would you like to enable Mock/Simulated SMS Sync mode instead to test the transaction automatic sync features?',
        [
          {
            text: 'Cancel',
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: 'Enable Mock Mode',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  } catch (err) {
    console.warn(err);
    return false;
  }
};
