import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";
import { mapLoginResponseToSession } from "../model/mappers";
import { useAuth } from "./useAuth";
import type { LoginApiRequest } from "../api/types";

export function useLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  return useMutation({
    mutationFn: async (credentials: LoginApiRequest) => {
      const raw = await loginUser(credentials);
      return mapLoginResponseToSession(raw);
    },
    onSuccess: (session) => {
      login(session);
      navigate("/map");
    },
  });
}
