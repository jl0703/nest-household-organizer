import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signInWithOAuthMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signInWithOAuth: signInWithOAuthMock,
    },
  }),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    signInWithPasswordMock.mockReset();
    signInWithOAuthMock.mockReset();
  });

  it("shows an error banner when password sign-in fails", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Invalid login credentials" } });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "wrong-pass" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid login credentials/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects on successful password sign-in", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "correct-pass" } });
    fireEvent.click(screen.getByRole("button", { name: /^sign in$/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/households/new"));
  });

  it("starts Google OAuth when the Google button is clicked", async () => {
    signInWithOAuthMock.mockResolvedValue({ error: null });

    render(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(signInWithOAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    );
  });
});
