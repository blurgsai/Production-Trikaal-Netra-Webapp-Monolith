import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { ChatBot } from "@/features/chatbot";
import { useChatbot } from "@/features/chatbot";

function AppLayout() {
  const { isChatbotOpen, closeChatbot } = useChatbot();

  return (
    <Box display="flex">
      <Sidebar />
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          width: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Header />
        <Outlet />
        <ChatBot open={isChatbotOpen} onClose={closeChatbot} />
      </Box>
    </Box>
  );
}

export default AppLayout;
