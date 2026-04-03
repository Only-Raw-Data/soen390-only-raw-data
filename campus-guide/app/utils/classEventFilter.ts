import { CLASS_PREFIXES } from "@/constants/classPrefixes";

export { CLASS_PREFIXES };

export function isClassEvent(title: string): boolean {
  const upper = title.toUpperCase();
  return CLASS_PREFIXES.some((prefix) => upper.startsWith(prefix));
}
