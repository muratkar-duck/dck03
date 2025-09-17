'use client';

import Link from 'next/link';
import { usePlanData } from '@/hooks/usePlanData';

export default function PlansPage() {
  const { plans, selection, loading, isAuthenticated } = usePlanData();
  const activePlanId = selection?.planId;

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <header className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">Üyelik Planlarımız</h1>
        <p className="text-[#7a5c36]">
          Ducktylo platformunda senaryonuzu hayata geçirmenize yardımcı olacak farklı
          üyelik seviyeleri sunuyoruz.
        </p>
        {isAuthenticated && (
          <p className="text-sm text-[#7a5c36]">
            Aktif planın vurgulanmıştır, dilersen diğer seçenekleri buradan
            karşılaştırabilirsin.
          </p>
        )}
      </header>

      {loading && isAuthenticated ? (
        <p className="text-center text-[#7a5c36]">Plan bilgilerin yükleniyor...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isActive = isAuthenticated && plan.id === activePlanId;

            return (
              <article
                key={plan.id}
                className={`card space-y-2 transition-shadow ${
                  isActive ? 'ring-2 ring-[#ffaa06] shadow-lg' : ''
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    <span aria-hidden>{plan.icon}</span> {plan.name}
                  </h2>
                  {isActive && (
                    <span className="inline-flex items-center rounded-full bg-[#ffaa06]/10 px-2 py-0.5 text-xs font-semibold text-[#ffaa06]">
                      Aktif Planın
                    </span>
                  )}
                </div>
                <p className="text-sm">{plan.tagline}</p>
                <ul className="text-sm list-disc list-inside text-[#7a5c36] space-y-1 mt-2">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <p className="font-bold text-[#ffaa06]">{plan.price}</p>
              </article>
            );
          })}
        </div>
      )}

      <div className="text-center mt-6">
        <Link href="/auth/sign-up-writer" className="btn btn-primary">
          Ücretsiz Başla
        </Link>
      </div>
    </div>
  );
}
