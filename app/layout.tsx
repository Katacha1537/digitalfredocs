import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FreeDoc$ | Gerador de Auditoria de Presença Digital Médica',
  description: 'Gere relatórios completos de auditoria de presença digital para médicos. Análise de 10 pilares, checklist de ações e plano estratégico de 90 dias.',
  keywords: 'presença digital médica, marketing médico, auditoria digital, FreeDoc, relatório médico',
  authors: [{ name: 'FreeDoc$' }],
  openGraph: {
    title: 'FreeDoc$ | Auditoria de Presença Digital Médica',
    description: 'Relatórios premium de presença digital para médicos.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
