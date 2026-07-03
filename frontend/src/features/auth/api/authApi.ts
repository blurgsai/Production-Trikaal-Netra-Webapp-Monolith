import { axiosInstance } from "@/shared/api";
import type { LoginApiRequest, LoginApiResponse } from "./types";

export async function loginUser(
  credentials: LoginApiRequest
): Promise<LoginApiResponse> {
  const body = new URLSearchParams();
  body.append("username", credentials.username);
  body.append("password", credentials.password);

  const response = await axiosInstance.post<LoginApiResponse>(
    "/users/login",
    body,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data;
}
