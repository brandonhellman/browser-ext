import { DocsThemeConfig } from 'nextra-theme-docs';

const config: DocsThemeConfig = {
  logo: '@browser-ext',
  project: {
    link: 'https://github.com/brandonhellman/browser-ext',
  },
  docsRepositoryBase: 'https://github.com/brandonhellman/browser-ext/tree/main/apps/web',
  head: (
    <>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      />
      <meta
        property="og:title"
        content="@browser-ext"
      />
      <meta
        property="og:description"
        content="The next generation of browser extension development"
      />
      <title>@browser-ext</title>
    </>
  ),
  footer: {
    content: '@browser-ext',
  },
};

export default config;
