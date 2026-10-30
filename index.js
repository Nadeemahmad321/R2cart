/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register background handler for FCM push notifications if native module is compiled
try {
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async remoteMessage => {
    console.log('[FCM Background Message Received]', remoteMessage?.notification?.title || remoteMessage?.data);
  });
} catch (e) {
  console.log('[FCM Background Registration Notice]: Native Firebase module not linked in current APK.', e?.message);
}

AppRegistry.registerComponent(appName, () => App);



