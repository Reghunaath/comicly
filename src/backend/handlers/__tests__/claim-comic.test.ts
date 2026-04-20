import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetRequiredUser = vi.fn();
const mockGetComic = vi.fn();
const mockClaimComicDb = vi.fn();

vi.mock("@/backend/lib/supabase/middleware", () => ({
  getRequiredUser: mockGetRequiredUser,
}));

vi.mock("@/backend/lib/db", () => ({
  getComic: mockGetComic,
  claimComic: mockClaimComicDb,
}));

import { claimComic } from "../claim-comic";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("claimComic handler", () => {
  it("throws AUTH_REQUIRED when user is not authenticated", async () => {
    mockGetRequiredUser.mockRejectedValue(new Error("AUTH_REQUIRED"));

    await expect(claimComic("comic-1")).rejects.toThrow("AUTH_REQUIRED");
  });

  it("throws NOT_FOUND when comic does not exist", async () => {
    mockGetRequiredUser.mockResolvedValue({ id: "user-1" });
    mockGetComic.mockResolvedValue(null);

    await expect(claimComic("missing-id")).rejects.toThrow("NOT_FOUND:");
  });

  it("throws FORBIDDEN when comic is owned by a different user", async () => {
    mockGetRequiredUser.mockResolvedValue({ id: "user-1" });
    mockGetComic.mockResolvedValue({ id: "comic-1", userId: "user-2" });

    await expect(claimComic("comic-1")).rejects.toThrow("FORBIDDEN:");
  });

  it("returns success without calling db when comic is already owned by current user", async () => {
    mockGetRequiredUser.mockResolvedValue({ id: "user-1" });
    mockGetComic.mockResolvedValue({ id: "comic-1", userId: "user-1" });

    const result = await claimComic("comic-1");

    expect(result).toEqual({ success: true });
    expect(mockClaimComicDb).not.toHaveBeenCalled();
  });

  it("claims guest comic and returns success when userId is null", async () => {
    mockGetRequiredUser.mockResolvedValue({ id: "user-1" });
    mockGetComic.mockResolvedValue({ id: "comic-1", userId: null });
    mockClaimComicDb.mockResolvedValue(undefined);

    const result = await claimComic("comic-1");

    expect(result).toEqual({ success: true });
    expect(mockClaimComicDb).toHaveBeenCalledWith("comic-1", "user-1");
  });
});
