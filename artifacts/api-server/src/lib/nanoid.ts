import { randomBytes } from "crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function nanoid(size: number = 8): string {
  const bytes = randomBytes(size);
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join("");
}
