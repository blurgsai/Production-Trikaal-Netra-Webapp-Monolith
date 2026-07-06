import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Box,
  IconButton,
  Paper,
  TextField,
  Typography,
  Button,
  alpha,
  Fade,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import HistoryIcon from "@mui/icons-material/History";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatHistoryPanel from "./ChatHistoryPanel";
import { useChatbot } from "../hooks/useChatbot";
import {
  createSession,
  fetchMessages,
  fetchChatHistory,
  streamMessage,
} from "../api/chatbotApi";
import type { Message, ChatSession } from "../model/types";

interface ChatbotProps {
  open: boolean;
  onClose: () => void;
}

export default function Chatbot({ open, onClose }: ChatbotProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [input, setInput] = useState("");
  const [isNewSession, setIsNewSession] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestIndexRef = useRef<number | null>(null);
  const { messages, setMessages } = useChatbot();
  const navigate = useNavigate();

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  // Fetch messages if session Id.Else create new session.
  useEffect(() => {
    if (open && sessionId) {
      if (isNewSession) {
        setIsNewSession(false);
        return;
      }

      setMessages([]);
      fetchMessages(sessionId).then(setMessages).catch(console.log);
    } else if (open && !sessionId) {
      createNewSession();
      setIsNewSession(true);
    }
  }, [sessionId, open, setMessages]);

  const createNewSession = async () => {
    try {
      const sessionId = await createSession();
      setSessionId(sessionId);

      // Re-fetch session chat history on creation of new session
      fetchChatHistory().then(setChatHistory).catch(console.log);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      message_id: Date.now(),
      role: "user",
      navigationLink: null,
      content: input,
    };

    setMessages([...messages, userMsg]);
    setInput("");

    // reset ref
    latestIndexRef.current = null;

    await streamMessage(
      sessionId!,
      input,
      (parsed) => {
        const { p, o, v } = parsed;

        // Only process content path
        if (!p?.startsWith("/messsage/content")) return;

        if (o !== "append") return;

        const text = v || "";

        // CREATE assistant message (first chunk)
        if (latestIndexRef.current === null) {
          const newMsg: Message = {
            message_id: Date.now() + 1,
            role: "assistant",
            navigationLink: null,
            content: text,
          };

          latestIndexRef.current = messages.length;
          setMessages([...messages, newMsg]);

          return;
        }

        // APPEND to existing message
        const idx = latestIndexRef.current;
        if (idx !== null && messages[idx]) {
          const updated = [...messages];
          updated[idx] = {
            ...updated[idx],
            content: (updated[idx].content || "") + text,
          };

          setMessages(updated);
        }
      },
      (error) => {
        console.error("Streaming error:", error);

        const idx = latestIndexRef.current;
        if (idx !== null && messages[idx]) {
          const updated = [...messages];
          updated[idx] = {
            ...updated[idx],
            content: "Error fetching response",
          };

          setMessages(updated);
        }
      }
    );
  };

  const navigateToLink = (link: string) => {
    navigate(link);
  };

  return (
    <>
      {open && (
        <Fade in={open} timeout={300}>
          <Paper
            elevation={12}
            sx={{
              position: "fixed",
              top: 0,
              bottom: 0,
              right: 0,
              width: fullscreen ? "100vw" : 500,
              height: "100vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: 0,
              zIndex: 9999,
              background: (theme) =>
                alpha(theme.palette.background.paper, 0.98),
              backdropFilter: "blur(20px)",
              borderLeft: (theme) =>
                `1px solid ${alpha(theme.palette.divider, 0.15)}`,
              boxShadow: (theme) =>
                `0 0 40px ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: (theme) =>
                  `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AutoAwesomeIcon sx={{ color: "primary.main", fontSize: 20 }} />
                </Box>
                <Typography variant="h6" fontWeight={700} color="primary">
                  AI Assistant
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 0.5 }}>
                {fullscreen && (
                  <IconButton
                    title="Toggle history"
                    onClick={() => setShowHistory((s) => !s)}
                    sx={{
                      color: "text.primary",
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    <HistoryIcon />
                  </IconButton>
                )}

                <IconButton
                  onClick={() => setFullscreen((f) => !f)}
                  sx={{
                    color: "text.primary",
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>

                <IconButton
                  onClick={onClose}
                  sx={{
                    color: "text.primary",
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
                      color: "error.main",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>

            {/* Main */}
            <Box
              sx={{
                flex: 1,
                display: "flex",
                overflow: "hidden",
              }}
            >
              {/* History */}
              {fullscreen && (
                <ChatHistoryPanel
                  sessionId={sessionId}
                  setSessionId={setSessionId}
                  open={showHistory}
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                  fetchChatHistory={async () => {
                    const history = await fetchChatHistory();
                    setChatHistory(history);
                  }}
                  createNewSession={createNewSession}
                />
              )}

              {/* Chat */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                {/* Messages - Scrollable Area */}
                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    px: fullscreen ? 3 : 2,
                    py: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
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
                  {messages.map((msg) => (
                    <Box
                      key={msg.message_id}
                      sx={{
                        width: "100%",
                        display: "flex",
                        justifyContent:
                          msg.role === "user" ? "flex-end" : "flex-start",
                        animation: "messageSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        "@keyframes messageSlide": {
                          "0%": { opacity: 0, transform: "translateY(20px) scale(0.95)" },
                          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
                        },
                      }}
                    >
                      <Box
                        sx={{
                          px: 2.5,
                          py: 2,
                          borderRadius: 2.5,
                          maxWidth: fullscreen ? "70%" : "85%",
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                          bgcolor: (theme) =>
                            msg.role === "user"
                              ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`
                              : alpha(theme.palette.background.default, 0.9),
                          color: msg.role === "user" ? "#fff" : "text.primary",
                          boxShadow: (theme) =>
                            msg.role === "user"
                              ? `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`
                              : theme.shadows[3],
                          border: (theme) =>
                            msg.role === "user"
                              ? "none"
                              : `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: (theme) =>
                              msg.role === "user"
                                ? `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`
                                : theme.shadows[6],
                          },
                        }}
                      >
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <Typography
                                variant="body2"
                                sx={{ mb: 0.75, lineHeight: 1.6, "&:last-child": { mb: 0 } }}
                              >
                                {children}
                              </Typography>
                            ),
                            code: ({ children }) => (
                              <Box
                                component="code"
                                sx={{
                                  bgcolor: (theme) =>
                                    msg.role === "user"
                                      ? alpha("#fff", 0.2)
                                      : alpha(theme.palette.grey[300], 0.4),
                                  px: 0.75,
                                  py: 0.4,
                                  borderRadius: 0.75,
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  fontWeight: 500,
                                }}
                              >
                                {children}
                              </Box>
                            ),
                          }}
                        >
                          {msg?.content}
                        </ReactMarkdown>

                        {msg.navigationLink && (
                          <Fragment>
                            <Typography py={1.5} variant="body2" fontWeight={500}>
                              Navigating To Map
                            </Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{
                                my: 1,
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                "&:focus": { outline: "none" },
                              }}
                              onClick={() => navigateToLink(msg?.navigationLink!)}
                            >
                              {msg.navigationLink}
                            </Button>
                          </Fragment>
                        )}
                      </Box>

                      <div ref={messagesEndRef} />
                    </Box>
                  ))}
                </Box>

                {/* Input - Fixed Bottom Section */}
                <Box
                  sx={{
                    p: 2.5,
                    px: fullscreen ? 3 : 2,
                    display: "flex",
                    gap: 1.5,
                    borderTop: (theme) =>
                      `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                    bgcolor: (theme) => alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <TextField
                    fullWidth
                    size="medium"
                    placeholder="Type a message…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.5,
                        bgcolor: (theme) =>
                          alpha(theme.palette.background.default, 0.7),
                        transition: "all 0.2s ease",
                        "&:hover": {
                          bgcolor: (theme) =>
                            alpha(theme.palette.background.default, 0.9),
                        },
                        "&.Mui-focused": {
                          bgcolor: (theme) =>
                            alpha(theme.palette.background.default, 0.9),
                          boxShadow: (theme) =>
                            `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                        },
                      },
                    }}
                  />

                  <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={!input.trim()}
                    sx={{
                      minWidth: 100,
                      height: 48,
                      borderRadius: 2.5,
                      fontWeight: 600,
                      textTransform: "none",
                      boxShadow: (theme) =>
                        `0 4px 15px ${alpha(theme.palette.primary.main, 0.3)}`,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: (theme) =>
                          `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                      },
                      "&:active": {
                        transform: "translateY(0)",
                      },
                      "&:disabled": {
                        opacity: 0.5,
                        boxShadow: "none",
                        transform: "none",
                      },
                    }}
                    startIcon={<SendIcon />}
                  >
                    Send
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Fade>
      )}
    </>
  );
}
