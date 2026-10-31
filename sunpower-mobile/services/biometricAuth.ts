import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeStorage } from './storage';

export class BiometricAuthService {
  private static BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

  // Check if device supports biometric authentication
  static async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      return await LocalAuthentication.hasHardwareAsync();
    } catch {
      return false;
    }
  }

  // Check if biometric is enrolled
  static async isEnrolled(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch {
      return false;
    }
  }

  // Get supported biometric types
  static async getSupportedTypes(): Promise<string[]> {
    if (Platform.OS === 'web') return [];
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'Fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'Face ID';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Iris';
          default:
            return 'Biometric';
        }
      });
    } catch {
      return [];
    }
  }

  // Authenticate with biometric
  static async authenticate(reason: string = 'Verify your identity'): Promise<{ success: boolean; error?: string }> {
    if (Platform.OS === 'web') {
      return { success: true }; // On web simulator, auto-pass
    }
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return { success: false, error: 'Biometric authentication not available on this device' };
      }

      const isEnrolled = await this.isEnrolled();
      if (!isEnrolled) {
        return { success: false, error: 'No biometric data enrolled. Please set up Face ID or Touch ID in settings' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error === 'user_cancel' ? 'Authentication cancelled' : 'Authentication failed' 
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { success: false, error: 'Authentication error occurred' };
    }
  }

  // Check if user has enabled biometric login
  static async isBiometricLoginEnabled(): Promise<boolean> {
    const enabled = await SafeStorage.getItem(this.BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  }

  // Enable biometric login
  static async enableBiometricLogin(): Promise<void> {
    await SafeStorage.setItem(this.BIOMETRIC_ENABLED_KEY, 'true');
  }

  // Disable biometric login
  static async disableBiometricLogin(): Promise<void> {
    await SafeStorage.deleteItem(this.BIOMETRIC_ENABLED_KEY);
  }

  // Quick login with biometric
  static async quickLogin(): Promise<{ success: boolean; error?: string }> {
    const isEnabled = await this.isBiometricLoginEnabled();
    
    if (!isEnabled) {
      return { success: false, error: 'Biometric login not enabled' };
    }

    return await this.authenticate('Login to SunPower');
  }
}
