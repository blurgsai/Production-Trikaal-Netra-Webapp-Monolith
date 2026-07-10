import { useEffect } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  alpha,
  Typography,
} from "@mui/material";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ChatIcon from "@mui/icons-material/Chat";
import type { ChatSession } from "../model/types";

interface ChatHistoryPanelProps {
  sessionId: string | null;
  setSessionId: (sessionId: string) => void;
  open: boolean;
  chatHistory: ChatSession[];
  fetchChatHistory: () => Promise<void>;
  createNewSession: () => Promise<void>;
}

export default function ChatHistoryPanel({
  sessionId,
  setSessionId,
  open,
  chatHistory,
  fetchChatHistory,
  createNewSession,
}: ChatHistoryPanelProps) {
  useEffect(() => {
    if (open) {
      fetchChatHistory();
    }
  }, [fetchChatHistory, open]);

  if (!open) return null;

  return (
    <Box
      sx={{
        width: 300,
        borderRight: (theme) => `1px solid ${alpha(theme.palette.divider, 0.15)}`,
        overflowY: "auto",
        p: 2,
        bgcolor: (theme) => alpha(theme.palette.background.default, 0.6),
        backdropFilter: "blur(10px)",
        "&::-webkit-scrollbar": {
          width: 8,
        },
        "&::-webkit-scrollbar-track": {
          bgcolor: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.25),
          borderRadius: 4,
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.4),
          },
        },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          Chat History
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {chatHistory?.length || 0} conversations
        </Typography>
      </Box>

      <List dense>
        <ListItem
          onClick={createNewSession}
          key="create_new_session"
          sx={{
            mb: 1,
            borderRadius: 2,
            p: 1.5,
            cursor: "pointer",
            transition: "all 0.2s ease",
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            "&:hover": {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              transform: "translateX(2px)",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 36,
              mr: 1,
              p: 0,
              color: "primary.main",
            }}
          >
            <EditNoteIcon fontSize="small" />
          </ListItemIcon>

          <ListItemText
            primary="New chat"
            primaryTypographyProps={{
              variant: "body2",
              fontWeight: 600,
              noWrap: true,
              color: "primary.main",
            }}
          />
        </ListItem>

        {chatHistory?.map((msg) => (
          <ListItem
            key={msg.sessionId}
            onClick={() => setSessionId(msg.sessionId)}
            sx={{
              mb: 1,
              borderRadius: 2,
              p: 2,
              cursor: "pointer",
              transition: "all 0.2s ease",
              bgcolor:
                msg?.sessionId === sessionId
                  ? (theme) => alpha(theme.palette.primary.main, 0.15)
                  : "transparent",
              border:
                msg?.sessionId === sessionId
                  ? (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  : "1px solid transparent",
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
                transform: "translateX(2px)",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                mr: 1.5,
                p: 0,
                color: msg?.sessionId === sessionId ? "primary.main" : "text.secondary",
              }}
            >
              <ChatIcon fontSize="small" />
            </ListItemIcon>

            <ListItemText
              primary={msg.title}
              primaryTypographyProps={{
                variant: "body2",
                fontWeight: msg?.sessionId === sessionId ? 600 : 400,
                noWrap: true,
                color: "text.primary",
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
