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
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useSession } from '@/hooks/useSession';

type PlanUpdateInput = PlanId | 'upgrade' | 'downgrade';

type UsePlanDataResult = {
  plans: Plan[];
  selection: PlanSelection | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSaving: boolean;
  updatePlan: (target: PlanUpdateInput) => Promise<void>;
  upgradePlan: () => Promise<void>;
  downgradePlan: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function usePlanData(): UsePlanDataResult {
  const { session, loading } = useSession();
  const [selection, setSelection] = useState<PlanSelection | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const role = session?.user?.user_metadata?.role as string | undefined;
  const userId = session?.user?.id as string | undefined;
  const supabase = useMemo(getSupabaseClient, []);

  const order: PlanId[] = useMemo(() => ['free', 'student', 'pro', 'top'], []);

  const plans = useMemo(() => {
    const planList = getPlans();
    const orderMap = new Map(order.map((planId, index) => [planId, index] as const));

    return planList.sort((a, b) => {
      const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }, [order]);

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
  }, [applyFallbackSelection, supabase, userId]);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      setSelection(null);
      setPlanLoading(false);
      return;
    }

    fetchSelection();
  }, [fetchSelection, loading, session]);

  const resolveTargetPlan = useCallback(
    (input: PlanUpdateInput): PlanId | null => {
      if (input === 'upgrade' || input === 'downgrade') {
        const currentPlan = selection?.planId ?? null;
        if (!currentPlan) {
          return order[0];
        }

        const currentIndex = order.indexOf(currentPlan);
        if (currentIndex === -1) {
          return order[0];
        }

        const step = input === 'upgrade' ? 1 : -1;
        const nextIndex = Math.min(order.length - 1, Math.max(0, currentIndex + step));

        return order[nextIndex] ?? currentPlan;
      }

      return input;
    },
    [order, selection?.planId],
  );

  const updatePlan = useCallback(
    async (target: PlanUpdateInput) => {
      if (!userId) {
        throw new Error('Kullanıcı oturumu bulunamadı.');
      }

      const planId = resolveTargetPlan(target);
      if (!planId) {
        return;
      }

      if (selection?.planId === planId) {
        return;
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
    [resolveTargetPlan, selection?.planId, supabase, userId],
  );

  const upgradePlan = useCallback(() => updatePlan('upgrade'), [updatePlan]);
  const downgradePlan = useCallback(() => updatePlan('downgrade'), [updatePlan]);

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
    upgradePlan,
    downgradePlan,
    refresh,
  };
}
