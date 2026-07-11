import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { mockApi } from "./server";

// jsdom doesn't implement scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Set up auth token so API calls don't fail
beforeAll(() => {
  localStorage.setItem("token", "test-token");
  mockApi.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  mockApi.resetHandlers();
  localStorage.setItem("token", "test-token");
});

afterAll(() => {
  mockApi.close();
});
