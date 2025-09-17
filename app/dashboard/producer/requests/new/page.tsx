import { redirect } from 'next/navigation';

export default function LegacyProducerRequestNewRedirect() {
  redirect('/dashboard/producer/listings/new');
}
