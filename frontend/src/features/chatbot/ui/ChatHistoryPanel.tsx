import { useEffect, type KeyboardEvent } from "react";
import {
  Box,
  List,
  ListItemButton,
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
  fullscreen?: boolean;
}

function activateOnEnterOrSpace(
  event: KeyboardEvent,
  action: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export default function ChatHistoryPanel({
  sessionId,
  setSessionId,
  open,
  chatHistory,
  fetchChatHistory,
  createNewSession,
  fullscreen = false,
}: ChatHistoryPanelProps) {
  useEffect(() => {
    if (open) {
      fetchChatHistory();
    }
  }, [fetchChatHistory, open]);

  if (!open) return null;

  return (
    <Box
      component="nav"
      aria-label="Chat history"
      sx={{
        width: fullscreen ? 300 : 240,
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

      <List dense aria-label="Conversations">
        <ListItemButton
          onClick={createNewSession}
          onKeyDown={(event) => activateOnEnterOrSpace(event, createNewSession)}
          aria-label="New chat"
          sx={{
            mb: 1,
            borderRadius: 2,
            p: 1.5,
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
        </ListItemButton>

        {chatHistory?.map((msg) => {
          const isSelected = msg?.sessionId === sessionId;
          return (
            <ListItemButton
              key={msg.sessionId}
              selected={isSelected}
              aria-current={isSelected ? "true" : undefined}
              aria-label={`Open chat: ${msg.title || "Untitled conversation"}`}
              onClick={() => setSessionId(msg.sessionId)}
              onKeyDown={(event) =>
                activateOnEnterOrSpace(event, () => setSessionId(msg.sessionId))
              }
              sx={{
                mb: 1,
                borderRadius: 2,
                p: 2,
                transition: "all 0.2s ease",
                bgcolor: isSelected
                  ? (theme) => alpha(theme.palette.primary.main, 0.15)
                  : "transparent",
                border: isSelected
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
                  color: isSelected ? "primary.main" : "text.secondary",
                }}
              >
                <ChatIcon fontSize="small" />
              </ListItemIcon>

              <ListItemText
                primary={msg.title}
                primaryTypographyProps={{
                  variant: "body2",
                  fontWeight: isSelected ? 600 : 400,
                  noWrap: true,
                  color: "text.primary",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
