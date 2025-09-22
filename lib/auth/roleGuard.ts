export type DashboardRole = 'producer' | 'writer';

export type DashboardGuard = {
  prefix: string;
  allowedRoles: DashboardRole[];
};

const DASHBOARD_ROLE_PATHS = {
  producer: '/dashboard/producer',
  writer: '/dashboard/writer',
} as const satisfies Record<DashboardRole, string>;

const DASHBOARD_GUARDS = [
  { prefix: '/dashboard/producer', allowedRoles: ['producer'] },
  { prefix: '/dashboard/writer', allowedRoles: ['writer'] },
] as const satisfies DashboardGuard[];

const DASHBOARD_ROOT = '/dashboard';

const normalizeRole = (role: string | null | undefined): DashboardRole | null => {
  if (!role) return null;

  if (role === 'producer' || role === 'writer') {
    return role;
  }

  return null;
};

export const getDashboardGuardForPath = (
  pathname: string
): DashboardGuard | undefined =>
  DASHBOARD_GUARDS.find((guard) =>
    pathname === guard.prefix || pathname.startsWith(`${guard.prefix}/`)
  );

export const getDashboardPathForRole = (
  role: string | null | undefined
): string | null => {
  const normalized = normalizeRole(role);

  return normalized ? DASHBOARD_ROLE_PATHS[normalized] : null;
};

export const resolveRedirectPath = (
  role: string | null | undefined,
  pathname: string
): string | null => {
  const dashboardGuard = getDashboardGuardForPath(pathname);
  if (!dashboardGuard) {
    return null;
  }

  const ownDashboard = getDashboardPathForRole(role);
  if (ownDashboard) {
    return ownDashboard;
  }

  return DASHBOARD_ROOT;
};

export const dashboardRoleGuards = DASHBOARD_GUARDS;
export const dashboardRolePaths = DASHBOARD_ROLE_PATHS;
export const dashboardRootPath = DASHBOARD_ROOT;
