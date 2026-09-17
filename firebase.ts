/**
 * firebase.ts — @react-native-firebase v22 modular API
 *
 * ★ google-services.json / GoogleService-Info.plist 배치 위치 ★
 *  Android : 프로젝트 루트 / google-services.json
 *            → app.json: android.googleServicesFile: "./google-services.json"
 *  iOS     : 프로젝트 루트 / GoogleService-Info.plist
 *            → app.json: ios.googleServicesFile: "./GoogleService-Info.plist"
 */

import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getFunctions } from '@react-native-firebase/functions';

// Cloud Functions 리전 asia-northeast3 (서울) 고정
const auth = getAuth();
const db = getFirestore();
const functions = getFunctions(undefined, 'asia-northeast3');

export { auth, db, functions };
