import { redirect } from 'next/navigation';

export default function ProducerRequestsRedirectPage() {
  redirect('/dashboard/producer/listings');
}
