import { describe, expect, it, vi } from "vitest";
import { runTypeAcquisition } from "@/lib/type-acquisition";

/**
 * Contract for the ATA wrapper: async rejections must reach `onError`
 * (never escape as unhandledRejections into the dev overlay), sync throws
 * likewise, and offline skips without calling at all.
 */
describe("runTypeAcquisition", () => {
  it("reports async rejections to onError", async () => {
    const ata = vi.fn(async () => {
      throw new Error("Failed to fetch");
    });
    const onError = vi.fn();
    runTypeAcquisition(ata, "const x = 1;", true, onError);
    expect(ata).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0]).toMatchObject({
      message: "Failed to fetch",
    });
  });

  it("reports sync throws and ignores resolves", async () => {
    const throwing = vi.fn(() => {
      throw new Error("sync boom");
    });
    const onError = vi.fn();
    runTypeAcquisition(throwing, "x", true, onError);
    expect(onError).toHaveBeenCalledTimes(1);

    const resolving = vi.fn(async () => {});
    const quiet = vi.fn();
    runTypeAcquisition(resolving, "x", true, quiet);
    await new Promise((r) => setTimeout(r, 10));
    expect(quiet).not.toHaveBeenCalled();
  });

  it("skips null ata, empty code and offline", () => {
    const ata = vi.fn(async () => {});
    const onError = vi.fn();
    runTypeAcquisition(null, "x", true, onError);
    runTypeAcquisition(undefined, "x", true, onError);
    runTypeAcquisition(ata, "", true, onError);
    runTypeAcquisition(ata, "x", false, onError);
    expect(ata).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
