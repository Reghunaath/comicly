import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignupPage from "../SignupPage";

// ---------------------------------------------------------------------------
// Supabase mock — vi.hoisted so refs are available inside vi.mock factory
// ---------------------------------------------------------------------------

const { mockSignUp, mockSignInWithOAuth } = vi.hoisted(() => ({
  mockSignUp: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
}));

vi.mock("@/frontend/lib/supabase-browser", () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
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
  usePathname: () => "/auth/signup",
}));

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockPush.mockReset();
  mockSignUp.mockReset();
  mockSignInWithOAuth.mockReset();
  mockSearchParams = new URLSearchParams();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  const user = userEvent.setup();
  render(<SignupPage />);
  return { user };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  email = "new@example.com",
  password = "password123"
) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole("button", { name: /^sign up$/i }));
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

  it("renders a Sign Up submit button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /^sign up$/i })
    ).toBeInTheDocument();
  });

  it("renders a Continue with Google button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("renders a link to /auth/login", () => {
    setup();
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/auth/login"
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
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows an error and does not call Supabase when email format is invalid", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows an error and does not call Supabase when password is empty", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    expect(
      await screen.findByText(/password is required/i)
    ).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows an error and does not call Supabase when password is shorter than 6 characters", async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "abc");
    await user.click(screen.getByRole("button", { name: /^sign up$/i }));

    expect(
      await screen.findByText(/at least 6 characters/i)
    ).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Loading state
// ---------------------------------------------------------------------------

describe("Loading State", () => {
  it("disables the Sign Up button and shows 'Creating account…' while request is in-flight", async () => {
    let resolve!: (value: unknown) => void;
    mockSignUp.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      })
    );

    const { user } = setup();
    await fillAndSubmit(user);

    expect(
      screen.getByRole("button", { name: /creating account/i })
    ).toBeDisabled();

    // Unblock so the component can clean up
    resolve({ data: { user: {} }, error: null });
  });
});

// ---------------------------------------------------------------------------
// 4. Successful submit
// ---------------------------------------------------------------------------

describe("Successful Submit", () => {
  it("calls signUp with the entered email and password", async () => {
    mockSignUp.mockResolvedValue({ data: { user: {} }, error: null });
    const { user } = setup();
    await fillAndSubmit(user, "new@example.com", "secret99");

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        password: "secret99",
      })
    );
  });

  it("redirects to the redirect param after successful signup", async () => {
    mockSignUp.mockResolvedValue({ data: { user: {} }, error: null });
    mockSearchParams = new URLSearchParams("redirect=/comic/abc");
    const { user } = setup();
    await fillAndSubmit(user);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/comic/abc"));
  });
});

// ---------------------------------------------------------------------------
// 5. Error handling
// ---------------------------------------------------------------------------

describe("Error Handling", () => {
  it("shows the Supabase error message on a failed sign-up", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    const { user } = setup();
    await fillAndSubmit(user);

    expect(
      await screen.findByText(/user already registered/i)
    ).toBeInTheDocument();
  });

  it("re-enables the Sign Up button after a failed sign-up", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    const { user } = setup();
    await fillAndSubmit(user);

    await screen.findByText(/user already registered/i);
    expect(
      screen.getByRole("button", { name: /^sign up$/i })
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
