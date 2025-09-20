'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { usePlanData } from '@/hooks/usePlanData';
import { getPlanById } from '@/lib/plans';

export default function WriterBillingPage() {
  return (
    <AuthGuard allowedRoles={['writer']}>
      <BillingContent />
    </AuthGuard>
  );
}

function BillingContent() {
  const { selection, loading, isSaving, upgradePlan, downgradePlan } = usePlanData();
  const [actionError, setActionError] = useState<string | null>(null);
  const plan = selection ? getPlanById(selection.planId) : undefined;

  if (loading) {
    return <p className="text-center text-[#7a5c36]">Plan bilgilerin yükleniyor...</p>;
  }

  const handleUpgrade = async () => {
    setActionError(null);
    try {
      await upgradePlan();
    } catch (error) {
      console.error('Plan yükseltme başarısız:', error);
      setActionError('Plan yükseltilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleCancel = async () => {
    setActionError(null);
    try {
      await downgradePlan();
    } catch (error) {
      console.error('Plan iptali başarısız:', error);
      setActionError('Plan iptal edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className="space-y-6" data-test-id="WRITER_BILLING">
      <h1 className="text-2xl font-bold">💳 Üyelik ve Fatura Bilgileri</h1>
      <p className="text-[#7a5c36]">
        Aktif planını ve ödeme geçmişini buradan takip edebilirsin.
      </p>

      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">
          🔐 Aktif Plan:{' '}
          <span className="text-[#ffaa06]">
            {plan ? `${plan.icon} ${plan.name}` : 'Plan seçimi bulunamadı'}
          </span>
        </h2>
        {selection?.renewsAt ? (
          <p className="text-sm text-[#7a5c36]">Yenileme Tarihi: {selection.renewsAt}</p>
        ) : (
          <p className="text-sm text-[#7a5c36]">
            Plan yenileme bilgisi bulunamadı. Planlarını{' '}
            <Link href="/plans" className="text-[#ffaa06] underline">
              Planlar sayfasından
            </Link>{' '}
            güncelleyebilirsin.
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button className="btn btn-secondary" onClick={handleUpgrade} disabled={isSaving}>
            {isSaving ? 'Güncelleniyor...' : 'Planı Yükselt'}
          </button>
          <button className="btn btn-danger" onClick={handleCancel} disabled={isSaving}>
            {isSaving ? 'Güncelleniyor...' : 'İptal Et'}
          </button>
        </div>
        {selection?.updatedAt && (
          <p className="text-xs text-[#7a5c36]">Son güncelleme: {selection.updatedAt}</p>
        )}
        {actionError && (
          <p role="alert" className="text-sm text-red-600">
            {actionError}
          </p>
        )}
      </div>

      <div className="card space-y-2">
        <h2 className="text-lg font-semibold">📄 Fatura Geçmişi</h2>
        {selection?.history?.length ? (
          <ul className="text-sm text-[#7a5c36] list-disc list-inside space-y-1">
            {selection.history.map((entry) => {
              const historyPlan = getPlanById(entry.planId);
              return (
                <li key={entry.id}>
                  {entry.billedAt} — {entry.amount} — {historyPlan ? historyPlan.name : 'Plan'}
                  {' '}({entry.status})
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-[#7a5c36]">
            Henüz fatura geçmişin bulunmuyor. Planlarını güncellemek için{' '}
            <Link href="/plans" className="text-[#ffaa06] underline">
              Planlar sayfasını
            </Link>{' '}
            ziyaret edebilirsin.
          </p>
        )}
      </div>
    </div>
  );
}
