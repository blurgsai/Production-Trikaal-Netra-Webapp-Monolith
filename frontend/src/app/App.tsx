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
import HistoricalPlaybackPage from "./pages/HistoricalPlaybackPage";
import WorldMonitoringPage from "./pages/WorldMonitoringPage";
import AppLayout from "./components/AppLayout";
import AdminLayout from "./components/AdminLayout";
import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import AdminPanelPage from "./pages/AdminPanelPage";
import { UserManagement, MapManagement, DataManagement } from "@/features/admin";
import { Dashboard, Threats, Articles } from "@/features/worldMonitoring";
import { FocusModePage } from "@/features/focusMode";
import { InsightsPage } from "@/features/insights";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={defenseTheme}>
        <CssBaseline />
        <BrowserRouter>
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
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/historical-playback" element={<HistoricalPlaybackPage />} />
                  <Route path="/focus-mode" element={<FocusModePage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/world-monitoring" element={<WorldMonitoringPage />}>
                    <Route index element={<Navigate to="/world-monitoring/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="threats" element={<Threats />} />
                    <Route path="threats/:eventId" element={<Threats />} />
                    <Route path="articles" element={<Articles />} />
                    <Route path="articles/:articleId" element={<Articles />} />
                  </Route>
                </Route>
                <Route
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route path="/admin-panel" element={<UserManagement />} />
                  <Route path="/admin-panel/map" element={<MapManagement />} />
                  <Route path="/admin-panel/data" element={<DataManagement />} />
                  <Route path="/admin-panel/events" element={<AdminPanelPage />} />
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
