import { Platform } from 'react-native';
import * as SMS from 'expo-sms';
import { SafeStorage } from './storage';

// SMS OTP Service
export class SMSAuthService {
  private static OTP_KEY = 'sms_otp';
  private static TOKEN_KEY = 'auth_token';
  private static USER_KEY = 'user_data';

  // Generate 6-digit OTP
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Check if SMS is available
  static async isSMSAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      return await SMS.isAvailableAsync();
    } catch {
      return false;
    }
  }

  // Send OTP via SMS (Backend integration simulated for demo)
  static async sendOTP(phoneNumber: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      const otp = this.generateOTP();
      
      await SafeStorage.setItem(
        this.OTP_KEY,
        JSON.stringify({ otp, phoneNumber, timestamp: Date.now() })
      );
      
      console.log(`📱 OTP sent to ${phoneNumber}: ${otp}`);

      return { success: true, otp };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: 'Failed to send OTP' };
    }
  }

  // Verify OTP
  static async verifyOTP(phoneNumber: string, enteredOTP: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storedData = await SafeStorage.getItem(this.OTP_KEY);
      
      if (!storedData) {
        return { success: false, error: 'No OTP found. Please request a new one.' };
      }

      const { otp, phoneNumber: storedPhone, timestamp } = JSON.parse(storedData);

      // Check if OTP is expired (5 minutes)
      const isExpired = Date.now() - timestamp > 5 * 60 * 1000;
      if (isExpired) {
        await SafeStorage.deleteItem(this.OTP_KEY);
        return { success: false, error: 'OTP expired. Please request a new one.' };
      }

      // Check if phone number matches
      if (storedPhone !== phoneNumber) {
        return { success: false, error: 'Phone number mismatch.' };
      }

      // Verify OTP
      if (otp === enteredOTP) {
        await SafeStorage.deleteItem(this.OTP_KEY);
        
        const token = `mock_token_${Date.now()}`;
        await this.saveAuthToken(token);
        
        return { success: true };
      } else {
        return { success: false, error: 'Invalid OTP. Please try again.' };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  // Resend OTP
  static async resendOTP(phoneNumber: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    await SafeStorage.deleteItem(this.OTP_KEY);
    return await this.sendOTP(phoneNumber);
  }

  // Save authentication token
  static async saveAuthToken(token: string): Promise<void> {
    await SafeStorage.setItem(this.TOKEN_KEY, token);
  }

  // Get authentication token
  static async getAuthToken(): Promise<string | null> {
    return await SafeStorage.getItem(this.TOKEN_KEY);
  }

  // Save user data
  static async saveUserData(userData: any): Promise<void> {
    await SafeStorage.setItem(this.USER_KEY, JSON.stringify(userData));
  }

  // Get user data
  static async getUserData(): Promise<any | null> {
    const data = await SafeStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  // Logout
  static async logout(): Promise<void> {
    await SafeStorage.deleteItem(this.TOKEN_KEY);
    await SafeStorage.deleteItem(this.USER_KEY);
    await SafeStorage.deleteItem(this.OTP_KEY);
  }

  // Format phone number
  static formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return `+${cleaned}`;
    }
    return `+${cleaned}`;
  }

  // Validate phone number (India)
  static validatePhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned) || /^91[6-9]\d{9}$/.test(cleaned);
  }
}
