import React from 'react';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Providers from './providers';

export const metadata = {
  title: 'Ko‘z · Intelligence Workspace',
  description: 'Intelligence link analysis, geospatial operations, and investigation workflow canvas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        {/* Applies the saved theme class before hydration so light-mode users don't see a dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('nexus.theme')||'null');if(s&&s.state&&s.state.theme==='light'){document.documentElement.classList.add('light');}}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-[var(--bg-main)] text-[var(--chrome-text-100)] min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
