'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function ProducerBrowseScriptRedirectPage() {
  const { id } = useParams<{ id?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (typeof id === 'string') {
      router.replace(`/dashboard/producer/scripts/${id}`);
    }
  }, [id, router]);

  return (
    <div
      className="space-y-3 text-sm text-gray-600"
      data-test-id="producer-browse-redirect"
    >
      <p>Senaryo detayları yeni sayfaya taşındı. Yönlendiriliyorsunuz...</p>
      {typeof id === 'string' && (
        <Link
          href={`/dashboard/producer/scripts/${id}`}
          className="text-blue-600 underline"
        >
          Otomatik yönlendirme gerçekleşmezse buraya tıklayın.
        </Link>
      )}
    </div>
  );
}
