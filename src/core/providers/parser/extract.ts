import { ParserError } from "./claude";

export const CV_MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

/** Extract plain text from an uploaded CV (PDF or DOCX). Images/photos are ignored. */
export async function extractCvText(data: Uint8Array, mimeType: string): Promise<string> {
  if (mimeType === CV_MIME_TYPES.pdf) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    return normalise(text);
  }
  if (mimeType === CV_MIME_TYPES.docx) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data) });
    return normalise(value);
  }
  throw new ParserError("unsupported_file", `Unsupported CV type: ${mimeType}`);
}

function normalise(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}
