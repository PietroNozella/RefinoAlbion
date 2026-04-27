import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REFINE FORGE",
  description: "Lucro e margem por lote refinado",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
