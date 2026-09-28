'use client';

import dynamic from 'next/dynamic';

const NewInvoiceClient = dynamic(() => import('./NewInvoiceClient'), { ssr: false });

export default function NewInvoicePage() {
  return <NewInvoiceClient />;
}
