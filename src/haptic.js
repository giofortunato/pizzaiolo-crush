import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Vibrazioni, con l'interruttore nelle impostazioni.
const KEY = 'pizzaiolo-crush/haptics/v1';
let on = true;

export async function initHaptics() {
  try { on = (await AsyncStorage.getItem(KEY)) !== '0'; } catch {}
  return on;
}

export function setHaptics(value) {
  on = value;
  AsyncStorage.setItem(KEY, value ? '1' : '0').catch(() => {});
}

export function haptic(kind = 'light') {
  if (!on) return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    else Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}
