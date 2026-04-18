import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();

vi.mock("../server", () => ({
  createRequestClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

import { getOptionalUser, getRequiredUser } from "../middleware";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOptionalUser", () => {
  it("returns the user when a session exists", async () => {
    const user = { id: "u1", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user } });

    const result = await getOptionalUser();

    expect(result).toEqual(user);
  });

  it("returns null when no session exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await getOptionalUser();

    expect(result).toBeNull();
  });
});

describe("getRequiredUser", () => {
  it("returns the user when a session exists", async () => {
    const user = { id: "u1", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user } });

    const result = await getRequiredUser();

    expect(result).toEqual(user);
  });

  it("throws AUTH_REQUIRED when no session exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(getRequiredUser()).rejects.toThrow("AUTH_REQUIRED");
  });
});
