import { describe, it, expect, vi } from "vitest";
import { loginUser } from "./authApi";
import type { LoginApiRequest } from "./types";

vi.mock("@/shared/api", () => ({
  axiosInstance: {
    post: vi.fn(),
  },
}));

import { axiosInstance } from "@/shared/api";

describe("authApi", () => {
  it("logs in user and returns session", async () => {
    const credentials: LoginApiRequest = { username: "user", password: "pass" };
    const data = { token: "abc", role: "admin", user_id: "1", username: "user" };
    vi.mocked(axiosInstance.post).mockResolvedValue({ data });
    const result = await loginUser(credentials);
    expect(result).toEqual(data);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/users/login",
      expect.objectContaining({
        toString: expect.any(Function),
      }),
      expect.objectContaining({ headers: { "Content-Type": "application/x-www-form-urlencoded" } })
    );
    const postedBody = vi.mocked(axiosInstance.post).mock.calls[0][1] as URLSearchParams;
    expect(postedBody.get("username")).toBe("user");
    expect(postedBody.get("password")).toBe("pass");
  });
});
