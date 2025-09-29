'use client';

import { useMemo, useState } from 'react';

type UserRole = 'writer' | 'producer';

type WriterScript = {
  id: string;
  title: string;
  genre: string;
  price: number;
};

type ProducerListing = {
  id: string;
  title: string;
  genre: string;
  budget: number;
  description: string;
};

type PipelineApplication = {
  id: string;
  listingId: string;
  scriptId: string;
  status: 'pending' | 'accepted';
};

type PipelineStatus = 'pending' | 'completed';

type PipelineStep = {
  id: string;
  label: string;
  status: PipelineStatus;
};

const writerEmail =
  process.env.NEXT_PUBLIC_E2E_WRITER_EMAIL ?? 'writer@ducktylo.test';
const producerEmail =
  process.env.NEXT_PUBLIC_E2E_PRODUCER_EMAIL ?? 'producer@ducktylo.test';

const createId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `${Date.now()}-${counter}`;
  };
})();

export function PipelineHarnessClient() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [writerScripts, setWriterScripts] = useState<WriterScript[]>([]);
  const [listings, setListings] = useState<ProducerListing[]>([]);
  const [applications, setApplications] = useState<PipelineApplication[]>([]);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [scriptForm, setScriptForm] = useState({
    title: 'Göbeklitepe Günlükleri',
    genre: 'dram',
    price: '5000',
  });
  const [listingForm, setListingForm] = useState({
    title: 'Festival İçin Duygusal Uzun Metraj',
    genre: 'dram',
    budget: '75000',
    description: 'Festival seçkisine uygun duygusal uzun metraj arıyoruz.',
  });
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [selectedListingId, setSelectedListingId] = useState('');

  const appendLog = (message: string) => {
    setEventLog((prev) => [...prev, message]);
  };

  const pipelineSteps: PipelineStep[] = useMemo(() => {
    const scriptStatus: PipelineStatus =
      writerScripts.length > 0 ? 'completed' : 'pending';
    const listingStatus: PipelineStatus =
      listings.length > 0 ? 'completed' : 'pending';
    const applicationStatus: PipelineStatus =
      applications.length > 0 ? 'completed' : 'pending';
    const acceptanceStatus: PipelineStatus =
      applications.some((application) => application.status === 'accepted')
        ? 'completed'
        : 'pending';

    return [
      {
        id: 'writer-script',
        label: 'Writer senaryosu oluşturur',
        status: scriptStatus,
      },
      {
        id: 'producer-listing',
        label: 'Producer ilan açar',
        status: listingStatus,
      },
      {
        id: 'writer-application',
        label: 'Writer ilana başvurur',
        status: applicationStatus,
      },
      {
        id: 'producer-acceptance',
        label: 'Producer başvuruyu kabul eder',
        status: acceptanceStatus,
      },
    ];
  }, [applications, listings.length, writerScripts.length]);

  const pipelineComplete = pipelineSteps.every(
    (step) => step.status === 'completed',
  );

  const handleCreateScript = (event: React.FormEvent) => {
    event.preventDefault();

    if (!scriptForm.title.trim()) {
      appendLog('⚠️ Senaryo başlığı boş bırakılamaz.');
      return;
    }

    const priceValue = Number(scriptForm.price);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      appendLog('⚠️ Lütfen geçerli bir senaryo fiyatı girin.');
      return;
    }

    const nextScript: WriterScript = {
      id: createId(),
      title: scriptForm.title.trim(),
      genre: scriptForm.genre,
      price: priceValue,
    };

    setWriterScripts((prev) => [...prev, nextScript]);
    appendLog(`✅ ${writerEmail} yeni senaryo ekledi: ${nextScript.title}`);
    setSelectedScriptId(nextScript.id);
  };

  const handleCreateListing = (event: React.FormEvent) => {
    event.preventDefault();

    if (!listingForm.title.trim()) {
      appendLog('⚠️ İlan başlığı boş bırakılamaz.');
      return;
    }

    const budgetValue = Number(listingForm.budget);
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) {
      appendLog('⚠️ Lütfen geçerli bir bütçe değeri girin.');
      return;
    }

    const nextListing: ProducerListing = {
      id: createId(),
      title: listingForm.title.trim(),
      genre: listingForm.genre,
      budget: budgetValue,
      description: listingForm.description.trim(),
    };

    setListings((prev) => [...prev, nextListing]);
    appendLog(`✅ ${producerEmail} yeni ilan açtı: ${nextListing.title}`);
    setSelectedListingId(nextListing.id);
  };

  const handleSubmitApplication = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedScriptId || !selectedListingId) {
      appendLog('⚠️ Başvuru için hem senaryo hem ilan seçilmelidir.');
      return;
    }

    const nextApplication: PipelineApplication = {
      id: createId(),
      listingId: selectedListingId,
      scriptId: selectedScriptId,
      status: 'pending',
    };

    setApplications((prev) => [...prev, nextApplication]);
    appendLog('✅ Writer ilan için senaryosuyla başvurdu.');
  };

  const handleAcceptApplication = (applicationId: string) => {
    setApplications((prev) =>
      prev.map((application) =>
        application.id === applicationId
          ? { ...application, status: 'accepted' }
          : application,
      ),
    );

    appendLog('🎉 Producer başvuruyu kabul etti.');
  };

  const renderScriptForm = () => (
    <form
      className="space-y-4 rounded-lg border border-amber-200 bg-white p-4"
      onSubmit={handleCreateScript}
    >
      <h2 className="text-lg font-semibold text-amber-900">
        ✍️ Senaryo oluştur
      </h2>
      <label className="block text-sm font-medium text-amber-800">
        Başlık
        <input
          data-testid="writer-script-title"
          className="mt-1 w-full rounded border border-amber-300 p-2"
          value={scriptForm.title}
          onChange={(event) =>
            setScriptForm((prev) => ({ ...prev, title: event.target.value }))
          }
          required
        />
      </label>
      <label className="block text-sm font-medium text-amber-800">
        Tür
        <select
          data-testid="writer-script-genre"
          className="mt-1 w-full rounded border border-amber-300 p-2"
          value={scriptForm.genre}
          onChange={(event) =>
            setScriptForm((prev) => ({ ...prev, genre: event.target.value }))
          }
        >
          <option value="dram">Dram</option>
          <option value="gerilim">Gerilim</option>
          <option value="komedi">Komedi</option>
          <option value="belgesel">Belgesel</option>
          <option value="bilim-kurgu">Bilim Kurgu</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-amber-800">
        Fiyat (₺)
        <input
          data-testid="writer-script-price"
          type="number"
          min={1}
          className="mt-1 w-full rounded border border-amber-300 p-2"
          value={scriptForm.price}
          onChange={(event) =>
            setScriptForm((prev) => ({ ...prev, price: event.target.value }))
          }
          required
        />
      </label>
      <button
        data-testid="writer-script-submit"
        type="submit"
        className="rounded bg-amber-500 px-4 py-2 font-semibold text-white shadow hover:bg-amber-600"
      >
        Senaryoyu Kaydet
      </button>
    </form>
  );

  const renderListingForm = () => (
    <form
      className="space-y-4 rounded-lg border border-emerald-200 bg-white p-4"
      onSubmit={handleCreateListing}
    >
      <h2 className="text-lg font-semibold text-emerald-900">
        🎬 İlan oluştur
      </h2>
      <label className="block text-sm font-medium text-emerald-800">
        Başlık
        <input
          data-testid="producer-listing-title"
          className="mt-1 w-full rounded border border-emerald-300 p-2"
          value={listingForm.title}
          onChange={(event) =>
            setListingForm((prev) => ({ ...prev, title: event.target.value }))
          }
          required
        />
      </label>
      <label className="block text-sm font-medium text-emerald-800">
        Tür
        <select
          data-testid="producer-listing-genre"
          className="mt-1 w-full rounded border border-emerald-300 p-2"
          value={listingForm.genre}
          onChange={(event) =>
            setListingForm((prev) => ({ ...prev, genre: event.target.value }))
          }
        >
          <option value="dram">Dram</option>
          <option value="gerilim">Gerilim</option>
          <option value="komedi">Komedi</option>
          <option value="belgesel">Belgesel</option>
          <option value="bilim-kurgu">Bilim Kurgu</option>
        </select>
      </label>
      <label className="block text-sm font-medium text-emerald-800">
        Bütçe (₺)
        <input
          data-testid="producer-listing-budget"
          type="number"
          min={1}
          className="mt-1 w-full rounded border border-emerald-300 p-2"
          value={listingForm.budget}
          onChange={(event) =>
            setListingForm((prev) => ({ ...prev, budget: event.target.value }))
          }
          required
        />
      </label>
      <label className="block text-sm font-medium text-emerald-800">
        Açıklama
        <textarea
          data-testid="producer-listing-description"
          className="mt-1 w-full rounded border border-emerald-300 p-2"
          rows={3}
          value={listingForm.description}
          onChange={(event) =>
            setListingForm((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
          required
        />
      </label>
      <button
        data-testid="producer-listing-submit"
        type="submit"
        className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-700"
      >
        İlanı Yayınla
      </button>
    </form>
  );

  const renderApplicationForm = () => (
    <form
      className="space-y-4 rounded-lg border border-sky-200 bg-white p-4"
      onSubmit={handleSubmitApplication}
    >
      <h2 className="text-lg font-semibold text-sky-900">
        📮 İlan başvurusu
      </h2>
      <label className="block text-sm font-medium text-sky-800">
        Senaryonuz
        <select
          data-testid="application-script-select"
          className="mt-1 w-full rounded border border-sky-300 p-2"
          value={selectedScriptId}
          onChange={(event) => setSelectedScriptId(event.target.value)}
        >
          <option value="">Bir senaryo seçin</option>
          {writerScripts.map((script) => (
            <option key={script.id} value={script.id}>
              {script.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-sky-800">
        Hedef ilan
        <select
          data-testid="application-listing-select"
          className="mt-1 w-full rounded border border-sky-300 p-2"
          value={selectedListingId}
          onChange={(event) => setSelectedListingId(event.target.value)}
        >
          <option value="">Bir ilan seçin</option>
          {listings.map((listing) => (
            <option key={listing.id} value={listing.id}>
              {listing.title}
            </option>
          ))}
        </select>
      </label>
      <button
        data-testid="application-submit"
        type="submit"
        className="rounded bg-sky-600 px-4 py-2 font-semibold text-white shadow hover:bg-sky-700"
      >
        Başvuruyu Gönder
      </button>
    </form>
  );

  const renderAcceptancePanel = () => (
    <div className="space-y-4 rounded-lg border border-purple-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-purple-900">
        ✅ Başvuruları Yönet
      </h2>
      {applications.length === 0 ? (
        <p className="text-sm text-purple-800">
          Henüz bekleyen başvuru bulunmuyor.
        </p>
      ) : (
        <ul className="space-y-3">
          {applications.map((application) => {
            const script = writerScripts.find(
              (item) => item.id === application.scriptId,
            );
            const listing = listings.find(
              (item) => item.id === application.listingId,
            );

            return (
              <li
                key={application.id}
                className="rounded border border-purple-300 p-3"
              >
                <p className="text-sm text-purple-900">
                  <span className="font-semibold">Senaryo:</span>{' '}
                  {script?.title ?? 'Bilinmiyor'}
                </p>
                <p className="text-sm text-purple-900">
                  <span className="font-semibold">İlan:</span>{' '}
                  {listing?.title ?? 'Bilinmiyor'}
                </p>
                <p
                  className="text-sm text-purple-800"
                  data-testid={`application-status-${application.id}`}
                >
                  Durum: {application.status === 'accepted'
                    ? 'Kabul edildi'
                    : 'Beklemede'}
                </p>
                {application.status === 'pending' ? (
                  <button
                    data-testid={`application-accept-${application.id}`}
                    className="mt-2 rounded bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700"
                    onClick={() => handleAcceptApplication(application.id)}
                    type="button"
                  >
                    Başvuruyu Kabul Et
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="space-y-2">
        <h1
          className="text-3xl font-bold text-slate-900"
          data-testid="pipeline-heading"
        >
          Ducktylo E2E Pipeline Harness
        </h1>
        <p className="text-sm text-slate-600">
          Test modu aktif. Aşağıdaki adımları kullanarak senaryo → ilan →
          başvuru → kabul sürecini doğrulayın.
        </p>
      </header>

      <section className="space-y-4 rounded-lg bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Oturum kontrolü
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            data-testid="login-writer"
            className="rounded bg-amber-500 px-4 py-2 font-semibold text-white shadow hover:bg-amber-600"
            onClick={() => {
              setCurrentRole('writer');
              appendLog(`✍️ Writer olarak giriş yapıldı: ${writerEmail}`);
            }}
            type="button"
          >
            Writer olarak giriş yap ({writerEmail})
          </button>
          <button
            data-testid="login-producer"
            className="rounded bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-700"
            onClick={() => {
              setCurrentRole('producer');
              appendLog(`🎬 Producer olarak giriş yapıldı: ${producerEmail}`);
            }}
            type="button"
          >
            Producer olarak giriş yap ({producerEmail})
          </button>
        </div>
        <p className="text-sm text-slate-700" data-testid="current-role">
          Aktif rol:{' '}
          {currentRole === 'writer'
            ? 'Writer'
            : currentRole === 'producer'
            ? 'Producer'
            : 'Seçilmedi'}
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <span
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600"
            data-testid="step-writer-script-status"
          >
            <span
              className={
                pipelineSteps[0].status === 'completed'
                  ? 'text-emerald-600'
                  : 'text-slate-500'
              }
            >
              {pipelineSteps[0].status === 'completed' ? '✓' : '•'}
            </span>
            {pipelineSteps[0].label}
          </span>
          {currentRole === 'writer' ? (
            renderScriptForm()
          ) : (
            <p className="rounded border border-dashed border-amber-300 p-4 text-sm text-amber-800">
              Writer girişi yaptıktan sonra yeni senaryo ekleyebilirsiniz.
            </p>
          )}
        </div>

        <div>
          <span
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600"
            data-testid="step-producer-listing-status"
          >
            <span
              className={
                pipelineSteps[1].status === 'completed'
                  ? 'text-emerald-600'
                  : 'text-slate-500'
              }
            >
              {pipelineSteps[1].status === 'completed' ? '✓' : '•'}
            </span>
            {pipelineSteps[1].label}
          </span>
          {currentRole === 'producer' ? (
            renderListingForm()
          ) : (
            <p className="rounded border border-dashed border-emerald-300 p-4 text-sm text-emerald-800">
              Producer girişi yaptıktan sonra ilan yayınlayabilirsiniz.
            </p>
          )}
        </div>

        <div>
          <span
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600"
            data-testid="step-writer-application-status"
          >
            <span
              className={
                pipelineSteps[2].status === 'completed'
                  ? 'text-emerald-600'
                  : 'text-slate-500'
              }
            >
              {pipelineSteps[2].status === 'completed' ? '✓' : '•'}
            </span>
            {pipelineSteps[2].label}
          </span>
          {currentRole === 'writer' && writerScripts.length > 0 &&
          listings.length > 0 ? (
            renderApplicationForm()
          ) : (
            <p className="rounded border border-dashed border-sky-300 p-4 text-sm text-sky-800">
              Writer rolüyle giriş yaparak ilanlara senaryo gönderebilirsiniz.
            </p>
          )}
        </div>

        <div>
          <span
            className="mb-2 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600"
            data-testid="step-producer-acceptance-status"
          >
            <span
              className={
                pipelineSteps[3].status === 'completed'
                  ? 'text-emerald-600'
                  : 'text-slate-500'
              }
            >
              {pipelineSteps[3].status === 'completed' ? '✓' : '•'}
            </span>
            {pipelineSteps[3].label}
          </span>
          {currentRole === 'producer' && applications.length > 0 ? (
            renderAcceptancePanel()
          ) : (
            <p className="rounded border border-dashed border-purple-300 p-4 text-sm text-purple-800">
              Producer rolüne geçerek bekleyen başvuruları yönetebilirsiniz.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg bg-slate-900 p-4 text-white">
        <h2 className="text-lg font-semibold">Pipeline özeti</h2>
        <ul className="space-y-1" data-testid="pipeline-summary">
          {pipelineSteps.map((step) => (
            <li key={step.id}>
              {step.status === 'completed' ? '✅' : '⏳'} {step.label}
            </li>
          ))}
        </ul>
        <p
          className="text-sm"
          data-testid="pipeline-final-status"
        >
          Genel durum: {pipelineComplete ? 'Pipeline doğrulandı' : 'Eksik adım var'}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Olay günlüğü</h2>
        <div
          className="h-48 overflow-y-auto rounded border border-slate-200 bg-white p-3 text-sm text-slate-700"
          data-testid="event-log"
        >
          {eventLog.length === 0 ? (
            <p className="text-slate-500">
              Henüz kayıt yok. Adımları uyguladıkça burada belirecek.
            </p>
          ) : (
            <ul className="space-y-1">
              {eventLog.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
