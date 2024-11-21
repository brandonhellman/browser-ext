import webpack from 'webpack';

const banner = (port: number) => `
(() => {
  const ws = new WebSocket('ws://localhost:${port}');
      
  ws.onmessage = (event) => {
    if (event.data === 'reload') {
      chrome.runtime.reload();
    }
  };

  ws.onclose = () => {
    console.log('Dev server disconnected. Retrying in 1s...');
    setTimeout(() => {
      chrome.runtime.reload();
    }, 1000);
  };
})();
`;

export function ReloadBackgroundPlugin(options: { entries: webpack.EntryObject; port: number }) {
  return new webpack.BannerPlugin({
    raw: true,
    entryOnly: true,
    include: Object.keys(options.entries),
    banner: banner(options.port),
  });
}