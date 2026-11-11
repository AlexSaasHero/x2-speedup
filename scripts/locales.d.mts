export function toChromeMessages(src: Record<string, string>): Record<string, unknown>;
export function readLocaleSources(srcDir: string): Promise<Record<string, Record<string, string>>>;
export function checkLocales(sources: Record<string, Record<string, string>>): string[];
export function buildLocales(srcDir: string, outdir: string): Promise<string[]>;
