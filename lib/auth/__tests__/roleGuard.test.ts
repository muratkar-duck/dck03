import {
  dashboardRoleGuards,
  dashboardRolePaths,
  getDashboardGuardForPath,
  getDashboardPathForRole,
  resolveRedirectPath,
} from '@/lib/auth/roleGuard';

describe('roleGuard helpers', () => {
  it('maintains the expected dashboard guard mapping', () => {
    expect(dashboardRoleGuards).toEqual([
      { prefix: '/dashboard/producer', allowedRoles: ['producer'] },
      { prefix: '/dashboard/writer', allowedRoles: ['writer'] },
    ]);
  });

  it('returns the correct dashboard path for each role', () => {
    expect(dashboardRolePaths).toEqual({
      producer: '/dashboard/producer',
      writer: '/dashboard/writer',
    });
    expect(getDashboardPathForRole('producer')).toBe('/dashboard/producer');
    expect(getDashboardPathForRole('writer')).toBe('/dashboard/writer');
  });

  it('matches guards for nested dashboard paths', () => {
    expect(getDashboardGuardForPath('/dashboard/writer')).toEqual(
      dashboardRoleGuards[1]
    );
    expect(getDashboardGuardForPath('/dashboard/writer/messages/inbox')).toEqual(
      dashboardRoleGuards[1]
    );
  });

  it('resolves redirect paths for unauthorized access', () => {
    expect(resolveRedirectPath('producer', '/dashboard/writer')).toBe(
      '/dashboard/producer'
    );
    expect(resolveRedirectPath('writer', '/dashboard/producer')).toBe(
      '/dashboard/writer'
    );
  });

  it('falls back to /dashboard when the role is missing or unknown', () => {
    expect(resolveRedirectPath(undefined, '/dashboard/producer')).toBe(
      '/dashboard'
    );
    expect(resolveRedirectPath('unknown-role', '/dashboard/writer')).toBe(
      '/dashboard'
    );
  });

  it('returns null when the path is not guarded', () => {
    expect(resolveRedirectPath('producer', '/somewhere-else')).toBeNull();
  });
});
