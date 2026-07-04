import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Paper,
  Stack,
} from "@mui/material";
import { Visibility, VisibilityOff, Lock } from "@mui/icons-material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useTheme } from "@mui/material/styles";
import { useLogin } from "../hooks/useLogin";

function LoginPage() {
  const theme = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: login, isPending } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending || !username.trim() || !password.trim()) return;
    login({ username, password });
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
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlineIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              },
            }}
          />

          <TextField
            fullWidth
            margin="normal"
            variant="outlined"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ fontSize: 20, color: "text.secondary" }} />
                </InputAdornment>
              ),
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
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
              },
            }}
          />

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
