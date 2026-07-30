export function takeSelectedFile(input: HTMLInputElement): File | null {
  const file = input.files?.item(0) ?? null;
  input.value = "";
  return file;
}
