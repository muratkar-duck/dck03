import { redirect } from 'next/navigation';

export default function LegacyProducerRequestDetailRedirect() {
  redirect('/dashboard/producer/listings');
}
