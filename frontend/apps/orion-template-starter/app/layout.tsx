import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'ORION Template Starter',
  description:
    'Hello world playground powered by ORION-CORE RAG for modular, animated design templates.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="px-6 py-12 md:px-10 lg:px-16 xl:px-24">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
