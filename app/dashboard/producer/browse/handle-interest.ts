import { SupabaseClient } from '@supabase/supabase-js';

type InterestScript = {
  id: string;
  title: string;
  owner_id: string | null;
};

export interface HandleInterestDependencies {
  supabase: SupabaseClient | null;
  notifyWriterOfInterest: (params: {
    writerId: string;
    script: InterestScript;
    producerId: string;
  }) => Promise<boolean>;
  showToast: (type: 'success' | 'error', message: string) => void;
  fetchImpl?: typeof fetch;
}

export async function handleInterest(
  script: InterestScript,
  deps: HandleInterestDependencies
): Promise<void> {
  const {
    supabase,
    notifyWriterOfInterest,
    showToast,
    fetchImpl = fetch,
  } = deps;

  if (!supabase) {
    const error = new Error('Supabase istemcisi kullanılamıyor.');
    showToast('error', error.message);
    throw error;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const message =
      authError.message || 'Kimlik doğrulama yapılırken bir hata oluştu.';
    showToast('error', message);
    throw authError;
  }

  if (!user) {
    showToast('error', 'Lütfen giriş yapın.');
    return;
  }

  if (!script.owner_id) {
    showToast('error', 'Senaryo sahibine ulaşılamadı.');
    return;
  }

  let stubSuccess = false;
  try {
    const response = await fetchImpl('/api/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptId: script.id,
        producerId: user.id,
        writerId: script.owner_id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Interest API yanıtı başarısız: ${response.status}`);
    }

    stubSuccess = true;
  } catch (apiError) {
    console.error('Interest API isteği başarısız:', apiError);
  }

  let interestStored = false;
  let writerNotified = false;
  try {
    const { error: upsertError } = await supabase
      .from('interests')
      .upsert(
        { producer_id: user.id, script_id: script.id },
        { onConflict: 'producer_id,script_id' }
      );

    if (upsertError) {
      throw upsertError;
    }

    interestStored = true;
    writerNotified = await notifyWriterOfInterest({
      writerId: script.owner_id,
      script,
      producerId: user.id,
    });
  } catch (rpcError: any) {
    if (!stubSuccess) {
      const message =
        rpcError?.message || 'İlgi kaydedilirken beklenmeyen bir hata oluştu.';
      showToast('error', message);
      throw rpcError;
    }

    console.warn(
      'Interest API başarılı oldu ancak Supabase yedek çağrısı başarısız:',
      rpcError
    );
  }

  if (interestStored && writerNotified) {
    showToast(
      'success',
      `${script.title} senaryosuna ilgi gösterdiniz. Senarist bilgilendirildi.`
    );
    return;
  }

  if (interestStored || stubSuccess) {
    showToast(
      'success',
      `${script.title} senaryosuna ilgi gösterdiniz. Senaristi bilgilendirme denemesi başarısız oldu, lütfen daha sonra kontrol edin.`
    );
    return;
  }

  const error = new Error(
    'İlgi kaydedilirken beklenmeyen bir hata oluştu.'
  );
  showToast('error', error.message);
  throw error;
}
