import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reforma do Apê - Controle de Mobília",
  description: "App de controle de mobília, eletrodomésticos e itens para a reforma do apartamento",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
