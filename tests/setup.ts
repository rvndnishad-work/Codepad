import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock Next.js Navigation hooks
vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    redirect: (url: string) => {
      const err = new Error(`Redirect to: ${url}`);
      (err as any).digest = `NEXT_REDIRECT;${url};307;`;
      throw err;
    },
  };
});

// Mock NextAuth
vi.mock("next-auth", () => {
  return {
    auth: vi.fn(async () => null),
    handlers: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
});

// Mock Stripe API client to prevent network hits during tests
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
      subscriptions: {
        retrieve: vi.fn(),
      },
    })),
  };
});

// Mock Resend Email SDK
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
      },
    })),
  };
});
