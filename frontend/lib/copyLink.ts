export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = String(text || "");
  if (!value) return false;
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard || typeof clipboard.writeText !== "function") return false;
  try {
    await clipboard.writeText(value);
  } catch {
    return false;
  }
  if (typeof clipboard.readText === "function") {
    try {
      const got = await clipboard.readText();
      if (got !== value) return false;
    } catch {
      // Write resolved; some browsers deny read without treating write as failure.
    }
  }
  return true;
}
