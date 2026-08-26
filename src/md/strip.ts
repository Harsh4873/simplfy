const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

const LOCAL_HREF =
  /^(?:file:\/\/|\/(?:Users|home|private|var|tmp|opt|usr)\/|[A-Za-z]:\\|\\\\|\.{0,2}\/)|(?:\.canvas\.tsx)(?:[?#].*)?$/i;

const FILE_URL = /file:\/\/[^\s)\]>]+/gi;
const POSIX_PATH = /\/(?:Users|home|private|var|tmp|opt)\/[^\s)\]>'"]+/g;
const WIN_PATH = /[A-Za-z]:\\[^\s)\]>'"]+/g;
const UNC_PATH = /\\\\[^\s)\]>'"]+/g;
const CANVAS_PATH = /[^\s)\]>'"]+\.canvas\.tsx\b/gi;

const FILLER = [
  /\bMonday['\u2019]s calls still hold\.?/gi,
  /\bPark it\.?/g,
  /\bDon['\u2019]t write the [^.]{0,80} story\.?/gi,
  /\bbeside the chat\b/gi,
  /\bI hope (?:that|this) helps\.?/gi,
  /\bLet me know if you(?:'d| would)? like[^.]*\.?/gi,
  /\bHope this helps\.?/gi,
];

function isLocalHref(href: string): boolean {
  const trimmed = href.trim().replace(/^<|>$/g, "");
  if (LOCAL_HREF.test(trimmed)) return true;
  if (trimmed.includes(".canvas.tsx")) return true;
  if (trimmed.startsWith("file:")) return true;
  return false;
}

export function looksLikeMarkdown(text: string): boolean {
  return /(^|\n)\s{0,3}#{1,6}\s|\*\*[^*]+\*\*|^\s*[-*+]\s|\[[^\]]+\]\([^)]+\)/m.test(text);
}

/** Keep original storage text intact; this is the display/parse surface. */
export function stripNoise(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  text = text.replace(MD_LINK, (_all, label: string, href: string) => {
    if (isLocalHref(href)) return String(label);
    if (/^https?:\/\//i.test(href.trim())) return String(label);
    return String(label);
  });

  text = text.replace(FILE_URL, "");
  text = text.replace(POSIX_PATH, "");
  text = text.replace(WIN_PATH, "");
  text = text.replace(UNC_PATH, "");
  text = text.replace(CANVAS_PATH, "");

  for (const pattern of FILLER) {
    text = text.replace(pattern, "");
  }

  text = text.replace(/\(\s*\)/g, "");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/[^\S\n]{2,}/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]+([,.;:!?])/g, "$1");
  return text.trim();
}
