'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createLivePlanSelection,
  getDefaultSelectionForRole,
  getPlans,
  isPlanId,
  type Plan,
  type PlanId,
  type PlanSelection,
} from '@/lib/plans';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';

type UsePlanDataResult = {
  plans: Plan[];
  selection: PlanSelection | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSaving: boolean;
  updatePlan: (planId: PlanId) => Promise<void>;
  refresh: () => Promise<void>;
};

export function usePlanData(): UsePlanDataResult {
  const { session, loading } = useSession();
  const [selection, setSelection] = useState<PlanSelection | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const role = session?.user?.user_metadata?.role as string | undefined;
  const userId = session?.user?.id as string | undefined;

  const plans = useMemo(() => getPlans(), []);

  const applyFallbackSelection = useCallback(() => {
    const fallback = getDefaultSelectionForRole(role) ?? null;
    setSelection(fallback);
  }, [role]);

  const fetchSelection = useCallback(async () => {
    if (!userId) {
      setSelection(null);
      return;
    }

    setPlanLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('plan, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data && isPlanId(data.plan)) {
        setSelection(createLivePlanSelection(data.plan, data.updated_at ?? null));
      } else {
        applyFallbackSelection();
      }
    } catch (err) {
      console.error('Plan bilgisi alınamadı:', err);
      applyFallbackSelection();
    } finally {
      setPlanLoading(false);
    }
  }, [applyFallbackSelection, userId]);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setSelection(null);
      setPlanLoading(false);
      return;
    }

    fetchSelection();
  }, [fetchSelection, loading, session]);

  const updatePlan = useCallback(
    async (planId: PlanId) => {
      if (!userId) {
        throw new Error('Kullanıcı oturumu bulunamadı.');
      }

      setIsSaving(true);
      try {
        const { data, error } = await supabase
          .from('user_plans')
          .upsert({ user_id: userId, plan: planId })
          .select('plan, updated_at')
          .single();

        if (error) {
          throw error;
        }

        const nextPlan = data && isPlanId(data.plan) ? data.plan : planId;
        setSelection(createLivePlanSelection(nextPlan, data?.updated_at ?? null));
      } finally {
        setIsSaving(false);
      }
    },
    [userId],
  );

  const refresh = useCallback(async () => {
    if (!session || !userId) return;
    await fetchSelection();
  }, [fetchSelection, session, userId]);

  return {
    plans,
    selection,
    loading: loading || planLoading,
    isAuthenticated: Boolean(session),
    isSaving,
    updatePlan,
    refresh,
  };
}
