import "server-only";

const VALID_USERNAME = process.env.AUTH_USERNAME ?? "focaldive";
const VALID_PASSWORD = process.env.AUTH_PASSWORD ?? "fd_2026";

export function checkCredentials(username: string, password: string): boolean {
  const u = Buffer.from(username);
  const p = Buffer.from(password);
  const eu = Buffer.from(VALID_USERNAME);
  const ep = Buffer.from(VALID_PASSWORD);
  return (
    u.length === eu.length &&
    p.length === ep.length &&
    timingSafeEqual(u, eu) &&
    timingSafeEqual(p, ep)
  );
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
