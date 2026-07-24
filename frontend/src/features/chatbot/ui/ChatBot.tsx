import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
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
  CircularProgress,
  Modal,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import HistoryIcon from "@mui/icons-material/History";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ChatHistoryPanel from "./ChatHistoryPanel";
import { useChatbot } from "../hooks/useChatbot";
import { useChatSession } from "../hooks/useChatSession";
import { useChatMessages } from "../hooks/useChatMessages";
import type { Message } from "../model/types";

const srOnlySx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

interface ChatbotProps {
  open: boolean;
  onClose: () => void;
}

export default function Chatbot({ open, onClose }: ChatbotProps) {
  const titleId = useId();
  const descId = useId();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [input, setInput] = useState("");
  const [isNewSession, setIsNewSession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestIndexRef = useRef<number | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const lastFailedInputRef = useRef<string | null>(null);
  const { messages, setMessages } = useChatbot();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const { chatHistory, createSession, fetchChatHistory } = useChatSession();
  const { fetchMessages, streamMessage } = useChatMessages();
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const createNewSession = useCallback(async () => {
    try {
      const newSessionId = await createSession();
      setIsNewSession(true);
      setMessages([]);
      setSessionId(newSessionId);
      setStreamError(null);
      setError(null);
    } catch (err) {
      console.log(err);
      setError("Failed to create a new chat session. Please try again.");
    }
  }, [createSession, setMessages]);

  useEffect(() => {
    if (open && sessionId) {
      if (isNewSession) {
        setIsNewSession(false);
        return;
      }

      setMessages([]);
      setIsLoading(true);
      setError(null);
      setStreamError(null);
      fetchMessages(sessionId)
        .then(setMessages)
        .catch((err) => {
          console.error(err);
          setError("Failed to load messages. Please try again.");
        })
        .finally(() => setIsLoading(false));
    } else if (open && !sessionId) {
      createNewSession();
      setIsNewSession(true);
    }
  }, [sessionId, open, setMessages, createNewSession, fetchMessages, isNewSession]);

  const runStream = useCallback(
    async (prompt: string) => {
      if (!sessionId) return;

      lastFailedInputRef.current = prompt;
      setStreamError(null);
      latestIndexRef.current = null;

      await streamMessage(
        sessionId,
        prompt,
        (parsed) => {
          const { part, operation, value } = parsed;

          if (!part?.startsWith("/messsage/content")) return;
          if (operation !== "append") return;

          const text = value || "";

          if (latestIndexRef.current === null) {
            const newMsg: Message = {
              messageId: String(Date.now() + 1),
              sessionId: sessionId!,
              role: "assistant",
              content: text,
              createdAt: new Date().toISOString(),
              navigationLink: null,
            };

            const current = messagesRef.current;
            const next = [...current, newMsg];
            latestIndexRef.current = current.length;
            messagesRef.current = next;
            setMessages(next);
            return;
          }

          const idx = latestIndexRef.current;
          const current = messagesRef.current;
          if (idx !== null && current[idx]) {
            const updated = [...current];
            updated[idx] = {
              ...updated[idx],
              content: (updated[idx].content || "") + text,
            };

            messagesRef.current = updated;
            setMessages(updated);
          }
        },
        (err: Error) => {
          console.error("Streaming error:", err);

          const idx = latestIndexRef.current;
          const current = messagesRef.current;

          if (idx !== null && current[idx]) {
            const updated = [...current];
            updated[idx] = {
              ...updated[idx],
              content: "Error fetching response",
            };

            messagesRef.current = updated;
            setMessages(updated);
          } else {
            const errorMsg: Message = {
              messageId: String(Date.now() + 1),
              sessionId: sessionId!,
              role: "assistant",
              content: "Error fetching response",
              createdAt: new Date().toISOString(),
              navigationLink: null,
            };

            const next = [...current, errorMsg];
            messagesRef.current = next;
            setMessages(next);
          }

          setStreamError(
            err.message || "Streaming failed. Please try again.",
          );
        },
      );
    },
    [sessionId, setMessages, streamMessage],
  );

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!sessionId) return;

    const prompt = input.trim();

    const userMsg: Message = {
      messageId: String(Date.now()),
      sessionId: sessionId!,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
      navigationLink: null,
    };

    setMessages([...messages, userMsg]);
    setInput("");
    await runStream(prompt);
  };

  const handleRetryStream = async () => {
    const prompt = lastFailedInputRef.current;
    if (!prompt || !sessionId) return;
    setStreamError(null);
    await runStream(prompt);
  };

  const handleRetryLoad = () => {
    setError(null);
    if (!sessionId) return;
    setIsLoading(true);
    fetchMessages(sessionId)
      .then(setMessages)
      .catch((err) => {
        console.error(err);
        setError("Failed to load messages. Please try again.");
      })
      .finally(() => setIsLoading(false));
  };

  const navigateToLink = (link: string) => {
    navigate(link);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideBackdrop
      disableEnforceFocus
      disableAutoFocus={false}
      disableRestoreFocus={false}
      aria-labelledby={titleId}
      aria-describedby={descId}
      sx={{
        pointerEvents: "none",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "stretch",
      }}
    >
      <Paper
        elevation={12}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        sx={{
          pointerEvents: "auto",
          position: "relative",
          top: 0,
          bottom: 0,
          right: 0,
          width: fullscreen ? "100vw" : 500,
          maxWidth: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          outline: "none",
          background: (theme) => alpha(theme.palette.background.paper, 0.98),
          backdropFilter: "blur(20px)",
          borderLeft: (theme) =>
            `1px solid ${alpha(theme.palette.divider, 0.15)}`,
          boxShadow: (theme) =>
            `0 0 40px ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Typography id={descId} component="p" sx={srOnlySx}>
          Chat with the AI assistant. Use Tab to move between controls. Press
          Escape to close.
        </Typography>

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
            <Typography
              id={titleId}
              variant="h6"
              fontWeight={700}
              color="primary"
            >
              AI Assistant
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              aria-label={
                showHistory ? "Hide chat history" : "Show chat history"
              }
              aria-pressed={showHistory}
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

            <IconButton
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              aria-pressed={fullscreen}
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
              aria-label="Close chatbot"
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
          {showHistory && (
            <ChatHistoryPanel
              sessionId={sessionId}
              setSessionId={setSessionId}
              open={showHistory}
              chatHistory={chatHistory}
              fetchChatHistory={fetchChatHistory}
              createNewSession={createNewSession}
              fullscreen={fullscreen}
            />
          )}

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
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
              {isLoading && (
                <Box
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                  }}
                >
                  <CircularProgress
                    size={48}
                    aria-label="Loading conversation"
                    sx={{ color: "primary.main" }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Loading conversation...
                  </Typography>
                </Box>
              )}

              {error && (
                <Box
                  role="alert"
                  aria-live="assertive"
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    p: 3,
                  }}
                >
                  <ErrorOutlineIcon
                    sx={{ fontSize: 64, color: "error.main" }}
                  />
                  <Typography
                    variant="h6"
                    color="error.main"
                    fontWeight={600}
                  >
                    Something went wrong
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                  >
                    {error}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={handleRetryLoad}
                    sx={{ mt: 2 }}
                  >
                    Retry
                  </Button>
                </Box>
              )}

              {!isLoading && !error && messages.length === 0 && (
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    p: 3,
                    textAlign: "center",
                  }}
                >
                  <ChatBubbleOutlineIcon
                    sx={{
                      fontSize: 80,
                      color: (theme) =>
                        alpha(theme.palette.primary.main, 0.3),
                    }}
                  />
                  <Typography
                    variant="h6"
                    color="text.primary"
                    fontWeight={600}
                  >
                    Start a new conversation
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ maxWidth: 300 }}
                  >
                    How can I help you today?
                  </Typography>
                </Box>
              )}

              {!isLoading &&
                !error &&
                messages.map((msg) => (
                  <Box
                    key={msg.messageId}
                    sx={{
                      width: "100%",
                      display: "flex",
                      justifyContent:
                        msg.role === "user" ? "flex-end" : "flex-start",
                      animation:
                        "messageSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      "@keyframes messageSlide": {
                        "0%": {
                          opacity: 0,
                          transform: "translateY(20px) scale(0.95)",
                        },
                        "100%": {
                          opacity: 1,
                          transform: "translateY(0) scale(1)",
                        },
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
                        color:
                          msg.role === "user" ? "#fff" : "text.primary",
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
                              sx={{
                                mb: 0.75,
                                lineHeight: 1.6,
                                "&:last-child": { mb: 0 },
                              }}
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
                          <Typography
                            py={1.5}
                            variant="body2"
                            fontWeight={500}
                          >
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
                            }}
                            onClick={() =>
                              navigateToLink(msg.navigationLink!)
                            }
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

            {streamError && (
              <Box
                role="alert"
                aria-live="assertive"
                sx={{
                  mx: 2,
                  mb: 1,
                  p: 1.5,
                  borderRadius: 2,
                  border: (theme) =>
                    `1px solid ${alpha(theme.palette.error.main, 0.4)}`,
                  bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" color="error.main">
                  {streamError}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleRetryStream}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Retry
                </Button>
              </Box>
            )}

            <Box
              sx={{
                p: 2.5,
                px: fullscreen ? 3 : 2,
                display: "flex",
                gap: 1.5,
                borderTop: (theme) =>
                  `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                bgcolor: (theme) =>
                  alpha(theme.palette.background.paper, 0.95),
                backdropFilter: "blur(10px)",
              }}
            >
              <TextField
                fullWidth
                size="medium"
                placeholder="Type a message…"
                aria-label="Message"
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
                aria-label="Send"
                onClick={handleSend}
                disabled={!input.trim() || !sessionId}
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
    </Modal>
  );
}
