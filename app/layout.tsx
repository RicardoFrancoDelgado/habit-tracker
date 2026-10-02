import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@phosphor-icons/web/regular/style.css";
import "@phosphor-icons/web/bold/style.css";
import "@phosphor-icons/web/fill/style.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Constância",
  description: "Controle de hábitos com metas",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#161826",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
