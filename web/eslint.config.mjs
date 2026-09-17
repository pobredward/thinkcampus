import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 모바일 앱과 동일하게 "마운트 시 useEffect 에서 데이터 조회 → setState" 패턴을 쓴다.
      // React Compiler 권고 규칙이라 런타임 오류와 무관하므로 끈다.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", ".next-emu/**", "out/**", "build/**", "next-env.d.ts", "e2e/shots/**"]),
]);

export default eslintConfig;
