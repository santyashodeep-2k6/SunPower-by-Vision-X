import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SafeStorage {
  static async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (err) {
        console.warn('localStorage error, falling back to AsyncStorage', err);
      }
      await AsyncStorage.setItem(key, value);
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (err) {
        console.warn('SecureStore error, falling back to AsyncStorage', err);
        await AsyncStorage.setItem(key, value);
      }
    }
  }

  static async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (err) {
        console.warn('localStorage error, falling back to AsyncStorage', err);
      }
      return await AsyncStorage.getItem(key);
    } else {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (err) {
        console.warn('SecureStore error, falling back to AsyncStorage', err);
        return await AsyncStorage.getItem(key);
      }
    }
  }

  static async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch (err) {
        console.warn('localStorage error, falling back to AsyncStorage', err);
      }
      await AsyncStorage.removeItem(key);
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (err) {
        console.warn('SecureStore error, falling back to AsyncStorage', err);
        await AsyncStorage.removeItem(key);
      }
    }
  }
}
