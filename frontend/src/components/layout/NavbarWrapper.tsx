'use client';

import dynamic from 'next/dynamic';

const Navbar = dynamic(
  () => import('./Navbar').then((m) => m.Navbar),
  { ssr: false }
);

export function NavbarWrapper() {
  return <Navbar />;
}
