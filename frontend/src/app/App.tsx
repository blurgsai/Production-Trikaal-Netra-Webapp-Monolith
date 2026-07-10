import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "../app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defenseTheme } from "@/shared/theme";
import { AuthProvider } from "@/features/auth";
import { ChatbotProvider } from "@/features/chatbot";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import { EventsPage } from "./pages/EventsPage";
import AppLayout from "./components/AppLayout";
import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from "./routes/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        <BrowserRouter>

          <AuthProvider>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/map" element={<MapPage />} />
                <Route path="/events" element={<EventsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>

          <ChatbotProvider>
            <AuthProvider>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/map" element={<MapPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </AuthProvider>
          </ChatbotProvider>

        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
