import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exerlayer — On-Chain Invoicing & AI Treasury Management",
  description:
    "Stablecoin-native invoice payment infrastructure with sub-second settlement on Arc L1, Circle CCTP V2 cross-chain bridge, and autonomous AI agent autopay.",
  keywords: ["invoice", "USDC", "Arc", "blockchain", "DeFi", "payments", "stablecoin", "AI agents", "CCTP"],
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
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
