'use client';

import dynamic from 'next/dynamic';

const PayClient = dynamic(() => import('./PayClient'), { ssr: false });

export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  return <PayClient params={params} />;
}
