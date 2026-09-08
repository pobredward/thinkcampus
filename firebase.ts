/**
 * firebase.ts — @react-native-firebase 인스턴스 통합 export
 *
 * ★ google-services.json / GoogleService-Info.plist 배치 위치 ★
 * ─────────────────────────────────────────────────────────────
 *  Android : 프로젝트 루트 / google-services.json
 *            → app.json: android.googleServicesFile: "./google-services.json"
 *
 *  iOS     : 프로젝트 루트 / GoogleService-Info.plist
 *            → app.json: ios.googleServicesFile: "./GoogleService-Info.plist"
 *
 *  두 파일 모두 .gitignore 에 등록되어 있으므로 커밋되지 않음.
 *  EAS Build 시에는 eas.json secrets 또는 EAS Secrets 로 관리 권장.
 * ─────────────────────────────────────────────────────────────
 *
 * @react-native-firebase 는 네이티브 레이어에서 자동 초기화되므로
 * JS 측에서 initializeApp() 을 별도 호출할 필요 없음.
 */

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';

// Cloud Functions 리전을 asia-northeast3 (서울)로 고정
const functionsInstance = functions('asia-northeast3');

export { auth, firestore, functionsInstance as functions };
