import { Analytics } from '@vercel/analytics/next';
import { type AppProps } from 'next/app';

function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default App;