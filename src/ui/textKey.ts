export function textKey(text: string, index: number) {
  return `${index}:${text.slice(0, 24)}`;
}
