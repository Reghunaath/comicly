import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../LoginPage";

// ---------------------------------------------------------------------------
// Supabase mock — vi.hoisted so refs are available inside vi.mock factory
// ---------------------------------------------------------------------------

const { mockSignInWithPassword, mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignInWithPassword: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock("@/frontend/lib/supabase-browser", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  },
}));

// ---------------------------------------------------------------------------
// Router / navigation mock
// ---------------------------------------------------------------------------

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/auth/login",
}));

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockPush.mockReset();
  mockSignInWithPassword.mockReset();
  mockSignInWithOAuth.mockReset();
  mockSearchParams = new URLSearchParams();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  const user = userEvent.setup();
  render(<LoginPage />);
  return { user };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  email = "test@example.com",
  password = "password123"
) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole("button", { name: /log in/i }));
}

// ---------------------------------------------------------------------------
// 1. Rendering
// ---------------------------------------------------------------------------

describe("Rendering", () => {
  it("renders an email input", () => {
    setup();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders a password input", () => {
    setup();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders a Log In submit button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /log in/i })
    ).toBeInTheDocument();
  });

  it("renders a Continue with Google button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("renders a link to /auth/signup", () => {
    setup();
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/auth/signup"
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Validation — client-side only, no Supabase calls
// ---------------------------------------------------------------------------

describe("Validation", () => {
  it("shows an error and does not call Supabase when email is empty", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("shows an error and does not call Supabase when email format is invalid", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("shows an error and does not call Supabase when password is empty", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      await screen.findByText(/password is required/i)
    ).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Loading state
// ---------------------------------------------------------------------------

describe("Loading State", () => {
  it("disables the Log In button and shows 'Signing in…' while request is in-flight", async () => {
    let resolve!: (value: unknown) => void;
    mockSignInWithPassword.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      })
    );

    const { user } = setup();
    await fillAndSubmit(user);

    expect(
      screen.getByRole("button", { name: /signing in/i })
    ).toBeDisabled();

    // Unblock so the component can clean up
    resolve({ data: { user: {} }, error: null });
  });
});

// ---------------------------------------------------------------------------
// 4. Successful submit
// ---------------------------------------------------------------------------

describe("Successful Submit", () => {
  it("calls signInWithPassword with the entered email and password", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: {} },
      error: null,
    });
    const { user } = setup();
    await fillAndSubmit(user, "hello@example.com", "secret99");

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "hello@example.com",
      password: "secret99",
    });
  });

  it("redirects to '/' by default after successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: {} },
      error: null,
    });
    const { user } = setup();
    await fillAndSubmit(user);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("redirects to the ?redirect= param value after successful login", async () => {
    mockSearchParams = new URLSearchParams("redirect=/library");
    mockSignInWithPassword.mockResolvedValue({
      data: { user: {} },
      error: null,
    });
    const { user } = setup();
    await fillAndSubmit(user);

    expect(mockPush).toHaveBeenCalledWith("/library");
  });

  it("falls back to '/' when ?redirect= is not a relative path (open-redirect guard)", async () => {
    mockSearchParams = new URLSearchParams("redirect=https://evil.com");
    mockSignInWithPassword.mockResolvedValue({
      data: { user: {} },
      error: null,
    });
    const { user } = setup();
    await fillAndSubmit(user);

    expect(mockPush).toHaveBeenCalledWith("/");
  });
});

// ---------------------------------------------------------------------------
// 5. Error handling
// ---------------------------------------------------------------------------

describe("Error Handling", () => {
  it("shows the Supabase error message on a failed login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    const { user } = setup();
    await fillAndSubmit(user);

    expect(
      await screen.findByText(/invalid login credentials/i)
    ).toBeInTheDocument();
  });

  it("re-enables the Log In button after a failed login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });
    const { user } = setup();
    await fillAndSubmit(user);

    await screen.findByText(/invalid login credentials/i);
    expect(
      screen.getByRole("button", { name: /log in/i })
    ).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 6. OAuth
// ---------------------------------------------------------------------------

describe("OAuth", () => {
  it("calls signInWithOAuth with provider 'google' when Continue with Google is clicked", async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
    const { user } = setup();
    await user.click(
      screen.getByRole("button", { name: /continue with google/i })
    );

    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" })
    );
  });
});
