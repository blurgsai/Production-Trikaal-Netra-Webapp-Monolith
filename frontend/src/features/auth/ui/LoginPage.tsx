import { useState } from "react";
import {
  Alert,
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Paper,
  Stack,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useTheme } from "@mui/material/styles";
import axios from "axios";
import { useLogin } from "../hooks/useLogin";

function getLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (error.response?.status === 401) {
      return "Invalid username or password";
    }
  }
  return "Login failed. Please try again.";
}

const loginFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
  },
  "& .MuiInputLabel-root": {
    color: "text.secondary",
  },
  "& .MuiInputLabel-root.Mui-focused, & .MuiInputLabel-root.MuiInputLabel-shrink":
    {
      color: "primary.main",
    },
};

function LoginPage() {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: login, isPending, error, reset } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !username.trim() || !password.trim()) return;
    login({ username, password });
  };

  const handleUsernameChange = (value: string) => {
    if (error) reset();
    setUsername(value);
  };

  const handlePasswordChange = (value: string) => {
    if (error) reset();
    setPassword(value);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        bgcolor: theme.palette.background.default,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 30%, ${theme.palette.primary.main}08 0%, transparent 60%)`,
          pointerEvents: "none",
        },
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: 380,
          p: 4,
          bgcolor: theme.palette.background.surface,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          position: "relative",
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${theme.palette.primary.main}15`,
        }}
      >
        <Stack alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              boxShadow: `0 4px 16px ${theme.palette.primary.main}40`,
            }}
          >
            <VisibilityOutlinedIcon sx={{ fontSize: 30 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ letterSpacing: 0.5 }}>
              Trikaal Netra
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1.5, fontSize: "0.65rem" }}>
              Maritime Surveillance
            </Typography>
          </Box>
        </Stack>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            variant="outlined"
            label="Username"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            error={Boolean(error)}
            sx={loginFieldSx}
          />

          <TextField
            fullWidth
            margin="normal"
            variant="outlined"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            error={Boolean(error)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={loginFieldSx}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {getLoginErrorMessage(error)}
            </Alert>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                cursor: "pointer",
                userSelect: "none",
                fontSize: "0.8rem",
                "&:hover": { color: "primary.main" },
                transition: "color 0.2s",
              }}
              onClick={() => alert("Forgot password clicked")}
            >
              Forgot Password?
            </Typography>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={isPending}
            sx={{
              mt: 3,
              py: 1.2,
              borderRadius: 1.5,
              fontWeight: 700,
              letterSpacing: 1,
              fontSize: "0.875rem",
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: (t) => `0 4px 16px ${t.palette.primary.main}30`,
              },
            }}
          >
            {isPending ? "AUTHENTICATING…" : "SIGN IN"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default LoginPage;
