export function companyFilter(user: { role: string; companyId: string | null }): Record<string, any> {
  if (user.role === 'Super Admin') return {};
  return { companyId: user.companyId };
}
