import { describe, expect, it } from "vitest";
import { viewerType, youtubeId } from "./safety-content";

describe("Contatos de Segurança", () => {
  it("reconhece links do YouTube", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
  });
  it("define o visualizador pelo tipo", () => {
    expect(viewerType({ kind: "FILE", mimeType: "application/pdf", name: "dds.pdf" })).toBe("pdf");
    expect(viewerType({ kind: "FILE", mimeType: "video/mp4", name: "v.mp4" })).toBe("video");
    expect(viewerType({ kind: "FILE", mimeType: null, name: "foto.JPG" })).toBe("image");
    expect(viewerType({ kind: "FILE", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", name: "a.pptx" })).toBe("download");
  });
});
