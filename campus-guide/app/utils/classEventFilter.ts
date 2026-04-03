export { CLASS_PREFIXES } from "@/constants/classPrefixes";

import { CLASS_PREFIXES } from "@/constants/classPrefixes";

export function isClassEvent(title: string): boolean {
  const upper = title.toUpperCase();
  return CLASS_PREFIXES.some((prefix) => upper.startsWith(prefix));
}
