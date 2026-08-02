import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web-only: configures the root HTML shell for static rendering.
// Runs in Node.js only — no browser APIs or global CSS imports here.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#1a1a1a" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            min-height: 100dvh;
            overflow: hidden;
            background: #1a1a1a;
          }
          #root {
            max-width: 430px;
            margin: 0 auto;
            min-height: 100vh;
            min-height: 100dvh;
            position: relative;
            overflow: hidden;
          }
          @media (prefers-color-scheme: light) {
            html, body { background: #fff; }
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
