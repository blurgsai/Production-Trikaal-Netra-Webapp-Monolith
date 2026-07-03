import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "../app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { darkTheme } from "@/shared/theme";
import { AuthProvider } from "@/features/auth";
import LoginPage from "./pages/LoginPage";
import MapPage from "./pages/MapPage";
import { EventsPage } from "./pages/EventsPage";
import FocusModePage from "./pages/FocusModePage";
import AppLayout from "./components/AppLayout";
import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import LloydsTablePage from "./pages/LloydsTablePage";
import WorldMonitoringPage from "./pages/WorldMonitoringPage";
import { Dashboard } from "@/features/worldMonitoringDashboard/ui/Dashboard";
import { Threats } from "@/features/WorldMonitoringThreats/ui/Threats";
import { Articles } from "@/features/WorldMonitoringArticles/ui/Articles";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={darkTheme}>
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
                <Route path="/focusmode" element={<FocusModePage />} />
                <Route
                  path="/focusmode/:vesselId"
                  element={<FocusModePage />}
                />
                <Route path="/lloyds-table" element={<LloydsTablePage />} />
                <Route path="/world-monitoring" element={<WorldMonitoringPage />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="threats/:eventId?" element={<Threats />} />
                  <Route path="articles/:articleId?" element={<Articles />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
