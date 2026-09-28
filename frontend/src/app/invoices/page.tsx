'use client';

import dynamic from 'next/dynamic';

const InvoicesClient = dynamic(() => import('./InvoicesClient'), { ssr: false });

export default function InvoicesPage() {
  return <InvoicesClient />;
}
