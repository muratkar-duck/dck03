'use client';

import { useMemo } from 'react';
import { getPlans, getSelectionForRole, type Plan, type PlanSelection } from '@/lib/plans';
import { useSession } from '@/hooks/useSession';

type UsePlanDataResult = {
  plans: Plan[];
  selection: PlanSelection | null;
  loading: boolean;
  isAuthenticated: boolean;
};

export function usePlanData(): UsePlanDataResult {
  const { session, loading } = useSession();
  const role = session?.user?.user_metadata?.role as string | undefined;

  const plans = useMemo(() => getPlans(), []);
  const selection = useMemo(() => {
    if (loading) return null;
    return getSelectionForRole(role);
  }, [loading, role]);

  return {
    plans,
    selection,
    loading,
    isAuthenticated: Boolean(session),
  };
}
