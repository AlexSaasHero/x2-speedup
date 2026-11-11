/** Replaced at build time by esbuild (`--dev` → true). Never true in a store build. */
declare const __DEV__: boolean;

/** Offline master license key, injected only in `--dev` builds; '' otherwise. */
declare const __DEV_MASTER_KEY__: string;

/** Browser family of the build (`--target=`). */
declare const __TARGET__: 'chrome' | 'firefox';
