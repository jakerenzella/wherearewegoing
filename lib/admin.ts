export function adminEmail(): string | null {
  const raw = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return raw || null;
}

export function isAdmin(email: string | null | undefined): boolean {
  const admin = adminEmail();
  if (!admin) return false;
  if (!email) return false;
  return email.toLowerCase() === admin;
}
