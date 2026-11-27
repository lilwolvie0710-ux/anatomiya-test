/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

declare module 'zxing-wasm/reader/zxing_reader.wasm?url' {
  const url: string;
  export default url;
}
