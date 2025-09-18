import type { Session } from '@supabase/supabase-js';

export type PlanId = 'student' | 'basic' | 'pro' | 'top-tier';

export function isPlanId(value: string | null | undefined): value is PlanId {
  if (!value) return false;
  return value === 'student' || value === 'basic' || value === 'pro' || value === 'top-tier';
}

export type Plan = {
  id: PlanId;
  name: string;
  icon: string;
  tagline: string;
  price: string;
  features: string[];
};

export type BillingHistoryEntry = {
  id: string;
  billedAt: string;
  amount: string;
  planId: PlanId;
  status: string;
};

export type PlanSelection = {
  planId: PlanId;
  renewsAt: string | null;
  history: BillingHistoryEntry[];
  updatedAt: string | null;
  source: 'live' | 'default';
};

const PLANS: Plan[] = [
  {
    id: 'student',
    name: 'Student',
    icon: '🎓',
    tagline: 'Sadece @edu.tr e-postaları için geçerlidir.',
    price: '₺0 / ₺49',
    features: ['Aylık 1 senaryo yükleme', 'Temel erişim', 'Özgeçmiş oluşturma'],
  },
  {
    id: 'basic',
    name: 'Basic',
    icon: '📝',
    tagline: 'Yeni başlayan senaristler için',
    price: '₺149 / ay',
    features: ['2 senaryo yükleme', 'Temel filtreleme erişimi', 'Mesajlaşma sistemi'],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: '💼',
    tagline: 'Düzenli senaryo üretenler için',
    price: '₺299 / ay',
    features: ['5 senaryo', 'Vitrin görünürlüğü', 'Temsiliyet & danışmanlık'],
  },
  {
    id: 'top-tier',
    name: 'Top Tier',
    icon: '🌟',
    tagline: 'Sektörün profesyonelleri için',
    price: '₺499 / ay',
    features: ['Sınırsız senaryo', 'Öne çıkma', 'Öncelikli destek'],
  },
];

const DEFAULT_PLAN_SELECTIONS: Record<string, PlanSelection> = {
  writer: {
    planId: 'pro',
    renewsAt: '31 Ağustos 2025',
    history: [
      {
        id: 'writer-2025-07',
        billedAt: '01 Temmuz 2025',
        amount: '₺299',
        planId: 'pro',
        status: 'Ödendi',
      },
      {
        id: 'writer-2025-06',
        billedAt: '01 Haziran 2025',
        amount: '₺299',
        planId: 'pro',
        status: 'Ödendi',
      },
      {
        id: 'writer-2025-05',
        billedAt: '01 Mayıs 2025',
        amount: '₺299',
        planId: 'pro',
        status: 'Ödendi',
      },
    ],
    updatedAt: null,
    source: 'default',
  },
  producer: {
    planId: 'basic',
    renewsAt: '01 Ağustos 2025',
    history: [
      {
        id: 'producer-2025-07',
        billedAt: '01 Temmuz 2025',
        amount: '₺149',
        planId: 'basic',
        status: 'Ödendi',
      },
      {
        id: 'producer-2025-06',
        billedAt: '01 Haziran 2025',
        amount: '₺149',
        planId: 'basic',
        status: 'Ödendi',
      },
      {
        id: 'producer-2025-05',
        billedAt: '01 Mayıs 2025',
        amount: '₺149',
        planId: 'basic',
        status: 'Ödendi',
      },
    ],
    updatedAt: null,
    source: 'default',
  },
};

function cloneSelection(selection: PlanSelection | null): PlanSelection | null {
  if (!selection) return null;

  return {
    ...selection,
    history: selection.history.map((entry) => ({ ...entry })),
  };
}

export function getPlans(): Plan[] {
  return PLANS.map((plan) => ({ ...plan, features: [...plan.features] }));
}

export function getPlanById(planId: PlanId): Plan | undefined {
  return PLANS.find((plan) => plan.id === planId);
}

export function getSelectionForRole(role?: string | null): PlanSelection | null {
  return getDefaultSelectionForRole(role);
}

export function getSelectionFromSession(session: Session | null): PlanSelection | null {
  const role = session?.user?.user_metadata?.role as string | undefined;
  return getSelectionForRole(role);
}

export function getDefaultSelectionForRole(role?: string | null): PlanSelection | null {
  if (!role) return null;
  return cloneSelection(DEFAULT_PLAN_SELECTIONS[role] ?? null);
}

export function createLivePlanSelection(planId: PlanId, updatedAt: string | null = null): PlanSelection {
  return {
    planId,
    renewsAt: null,
    history: [],
    updatedAt,
    source: 'live',
  };
}
