import { describe, expect, it } from "vitest";
import { parseCsv } from "./import-esco";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and embedded newlines", () => {
    const rows = parseCsv(
      'conceptUri,preferredLabel,altLabels\r\nhttp://x/1,"Python, the language","py\nPython 3"\nhttp://x/2,"say ""hi""",\n',
    );
    expect(rows).toEqual([
      {
        conceptUri: "http://x/1",
        preferredLabel: "Python, the language",
        altLabels: "py\nPython 3",
      },
      { conceptUri: "http://x/2", preferredLabel: 'say "hi"', altLabels: "" },
    ]);
  });
});
