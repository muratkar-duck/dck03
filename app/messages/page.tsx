import { redirect } from 'next/navigation';

import EmptyState from '@/components/EmptyState';
import { getServerSession } from '@/lib/serverSession';

export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/sign-in');
  }

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">Mesajlar</h1>
      <EmptyState title="Henüz mesaj yok" />
    </main>
  );
}
