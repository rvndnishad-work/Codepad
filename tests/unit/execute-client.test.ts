import { describe, expect, it, vi, afterEach } from "vitest";
import {
  postExecute,
  executeBodyForFiles,
} from "@/lib/execute-client";

/**
 * Contract for the shared execute client: URL/method/headers/body shape,
 * multi-file body building, and omission of empty extras (single-file
 * payloads must stay byte-identical to the legacy calls).
 */
describe("execute-client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts JSON to /api/execute and parses the response", async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({ stdout: "hi" }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await postExecute({ language: "python", code: "x" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/execute");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      language: "python",
      code: "x",
    });
    expect(res).toEqual({ status: 200, data: { stdout: "hi" } });
  });

  it("returns null data when the body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 500,
        json: async () => {
          throw new Error("bad json");
        },
      })),
    );
    expect(await postExecute({ language: "python", code: "x" })).toEqual({
      status: 500,
      data: null,
    });
  });

  it("builds multi-file bodies with entry + siblings", () => {
    const body = executeBodyForFiles({
      language: "python",
      activeFilePath: "/index.py",
      files: {
        "/index.py": "from h import v\nprint(v)",
        "/h.py": "v = 1",
        "/index.html": { code: "<html></html>", hidden: true },
      },
      speculative: false,
      codeHash: "abc",
      stdin: "in",
    });
    expect(body).toEqual({
      language: "python",
      code: "from h import v\nprint(v)",
      speculative: false,
      codeHash: "abc",
      files: [{ name: "h.py", content: "v = 1" }],
      stdin: "in",
    });
  });

  it("omits empty extras, hash and stdin for single-file calls", () => {
    expect(
      executeBodyForFiles({
        language: "python",
        activeFilePath: "/index.py",
        files: { "/index.py": "print(1)" },
        speculative: true,
      }),
    ).toEqual({
      language: "python",
      code: "print(1)",
      speculative: true,
    });
  });
});
