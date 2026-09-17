/**
 * app.json 을 기본으로, Firebase 설정 파일 경로만 환경에 맞게 바꾼다.
 *  - 로컬 개발: 프로젝트 루트의 google-services.json / GoogleService-Info.plist (git 에는 올리지 않음)
 *  - EAS Build: 파일 환경변수 GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST 가 가리키는 경로
 *      eas env:set --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret \
 *        --environment development --environment preview --environment production
 *      eas env:set --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist --visibility secret \
 *        --environment development --environment preview --environment production
 */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? config.ios?.googleServicesFile,
  },
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
