import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BrandIntro } from "@/features/brand/brand-intro";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Coilora",
    template: "%s | Coilora",
  },
  description:
    "A calm, source-grounded study workspace for medical and allied-health students.",
  icons: {
    icon: "/brand/coilora-favicon.png",
    shortcut: "/brand/coilora-favicon.png",
    apple: "/brand/coilora-favicon.png",
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <BrandIntro />
        {children}
      </body>
    </html>
  );
}
