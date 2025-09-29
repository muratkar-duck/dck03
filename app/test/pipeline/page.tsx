import { notFound } from 'next/navigation';
import { PipelineHarnessClient } from './PipelineHarnessClient';

export const metadata = {
  title: 'E2E Pipeline Harness',
};

export default function PipelineHarnessPage() {
  if (process.env.NEXT_PUBLIC_E2E_TEST_MODE !== 'true') {
    notFound();
  }

  return <PipelineHarnessClient />;
}
