não rolou. prefiro que volce altere o codigo do layout de uma vez, completo.
import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
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
    <Script
      src="https://www.googletagmanager.com/gtag/js?id=G-31EWWMH1FP"
      strategy="afterInteractive"
          />
  <Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-31EWWMH1FP');
  `}
</Script>
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
