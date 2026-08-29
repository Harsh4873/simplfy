import { relPathOf, shouldSkipRelPath } from "./ingest";

type EntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (ok: (file: File) => void, err?: (error: DOMException) => void) => void;
  createReader?: () => {
    readEntries: (ok: (entries: EntryLike[]) => void, err?: (error: DOMException) => void) => void;
  };
};

function stampPath(file: File, rel: string): File {
  const current = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  if (current === rel) return file;
  try {
    Object.defineProperty(file, "webkitRelativePath", { value: rel, configurable: true });
  } catch {
    /* some environments freeze File */
  }
  return file;
}

async function readAllEntries(
  reader: NonNullable<EntryLike["createReader"]> extends () => infer R ? R : never,
): Promise<EntryLike[]> {
  const batch: EntryLike[] = [];
  for (;;) {
    const chunk = await new Promise<EntryLike[]>((resolve, reject) => {
      reader.readEntries(resolve, (error) => reject(error));
    });
    if (!chunk.length) break;
    batch.push(...chunk);
  }
  return batch;
}

async function walkEntry(entry: EntryLike, out: File[], prefix: string): Promise<void> {
  const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (shouldSkipRelPath(rel)) return;
  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file!(resolve, (error) => reject(error));
    });
    out.push(stampPath(file, rel));
    return;
  }
  if (entry.isDirectory && entry.createReader) {
    const children = await readAllEntries(entry.createReader());
    for (const child of children) await walkEntry(child, out, rel);
  }
}

export async function filesFromDataTransfer(data: DataTransfer): Promise<File[]> {
  const items = [...data.items];
  const entries: EntryLike[] = [];
  for (const item of items) {
    const getter = (item as DataTransferItem & { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry;
    const raw = getter?.();
    if (raw && typeof raw === "object") entries.push(raw as EntryLike);
  }
  if (entries.length) {
    const files: File[] = [];
    for (const entry of entries) await walkEntry(entry, files, "");
    if (files.length) return files;
  }
  return [...data.files].map((file) => stampPath(file, relPathOf(file)));
}
