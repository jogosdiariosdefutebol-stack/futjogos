import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FutJogos — Jogos diários de futebol",
  description: "Teste seu conhecimento do futebol brasileiro. Top 10, Escalações e Bingo todo dia.",
  keywords: "futebol, quiz, jogos, brasileirão, champions league",
  openGraph: {
    title: "FutJogos",
    description: "Jogos diários de futebol brasileiro",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#FFD700" }}>
        {children}
      </body>
    </html>
  );
}
