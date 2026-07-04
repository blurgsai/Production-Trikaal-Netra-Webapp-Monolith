import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Paper,
} from "@mui/material";
import { Visibility, VisibilityOff, Person, Lock } from "@mui/icons-material";
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
        bgcolor: theme.palette.background.paper,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: 360,
          p: 4,
          bgcolor: theme.palette.background.default,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          textAlign: "center",
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: 70,
            height: 70,
            bgcolor: theme.palette.primary.main,
            borderRadius: "50%",
            margin: "0 auto 24px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: theme.palette.primary.contrastText,
          }}
        >
          <Person sx={{ fontSize: 40 }} />
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="dense"
            variant="outlined"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Person color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
              },
              input: { color: theme.palette.text.primary },
            }}
          />

          <TextField
            fullWidth
            margin="dense"
            variant="outlined"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: theme.palette.text.primary,
              },
              input: { color: theme.palette.text.primary },
            }}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 1,
              alignItems: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.disabled,
                cursor: "pointer",
                userSelect: "none",
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
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              letterSpacing: 2,
              fontWeight: 400,
              "&:hover": {
                bgcolor: theme.palette.primary.dark,
              },
            }}
          >
            {isPending ? "LOGGING IN..." : "LOGIN"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

export default LoginPage;
