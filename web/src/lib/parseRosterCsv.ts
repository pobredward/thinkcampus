/** @deprecated parseRosterTable / parseRosterText 사용 */
export type { ParsedRosterRow } from "./parseRosterTable";
export { HEADER_ALIASES, parseRosterText } from "./parseRosterTable";

import { parseRosterText } from "./parseRosterTable";

export function parseRosterCsv(text: string) {
  return parseRosterText(text);
}
