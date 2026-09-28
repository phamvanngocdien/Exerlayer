import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exerlayer — On-Chain Invoice Platform on Arc",
  description:
    "Create, pay, and manage invoices on-chain with USDC. Built on Arc L1 with sub-second settlement, AI agents, and cross-chain payments.",
  keywords: ["invoice", "USDC", "Arc", "blockchain", "DeFi", "payments", "stablecoin"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen flex flex-col">
            <NavbarWrapper />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
