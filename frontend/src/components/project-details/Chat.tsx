import { useCallback, useEffect, useState } from "react";
import { chatHistory, sendMessage } from "../../api/projectDetailsApi";
import { FaBackward } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { MdAutorenew } from "react-icons/md";
import { RiDownloadFill } from "react-icons/ri";
import { CiSaveDown2 } from "react-icons/ci";
import SavedQueryPopup from "../settings-components/SavedQueryPopup";

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | string;
  content: string;
  sqlDraft?: string | null;
  createdAt?: string;
};

type ChatProps = {
  projectId: number;
  chatId?: number | null;
};

const Chat = ({ projectId, chatId }: ChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSavePopupOpen, setIsSavePopupOpen] = useState(false);
  const [sqlDraftToSave, setSqlDraftToSave] = useState("");

  const navigate = useNavigate();

  const fetchChatHistory = useCallback(async () => {
    if (typeof chatId === "undefined" || chatId === null) {
      setMessages([]);
      return;
    }

    const parsedChatId = Number(chatId);
    if (!Number.isFinite(parsedChatId) || parsedChatId <= 0) {
      setMessages([]);
      return;
    }

    try {
      const response = await chatHistory(projectId, parsedChatId);
      const data = (response as { messages?: ChatMessage[] })?.messages || [];
      console.log(response);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("chatHistory", error);
      setMessages([]);
    }
  }, [chatId, projectId]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const sendMessageToAi = async () => {
    const trimmed = userMessage.trim();
    if (!trimmed || isSending) {
      return;
    }

    if (typeof chatId === "undefined" || chatId === null) {
      console.warn("Brak identyfikatora czatu, nie można wysłać wiadomości.");
      return;
    }

    const parsedChatId = Number(chatId);
    if (!Number.isFinite(parsedChatId) || parsedChatId <= 0) {
      return;
    }

    const optimisticMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setUserMessage("");
    setIsSending(true);

    try {
      const response = await sendMessage(projectId, parsedChatId, trimmed);
      console.log("[Chat] Odpowiedź wysłanej wiadomości:", response);
      await fetchChatHistory();
    } catch (error) {
      console.error("sendMessage", error);
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticMessage.id)
      );
    } finally {
      setIsSending(false);
    }
  };

  const sqlKeywords = [
    "SELECT",
    "FROM",
    "WHERE",
    "JOIN",
    "UPDATE",
    "INSERT",
    "DELETE",
    "GROUP",
    "ORDER",
    "BY",
    "LIMIT",
    "AND",
    "OR",
  ];

  const keywordSet = new Set(sqlKeywords);

  const renderSql = (sql: string) => {
    const lines = sql.split("\n");

    return (
      <pre className="font-mono text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed">
        {lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {line.split(" ").map((word, wordIndex) => {
              const isKeyword = keywordSet.has(word.toUpperCase());
              const colorClass = isKeyword
                ? "text-orange-400"
                : "text-neutral-200";

              return (
                <span key={`${lineIndex}-${wordIndex}`} className={colorClass}>
                  {wordIndex > 0 ? " " : ""}
                  {word}
                </span>
              );
            })}
            {lineIndex < lines.length - 1 ? "\n" : ""}
          </span>
        ))}
      </pre>
    );
  };

  return (
    <div className="h-full flex flex-col gap-1">
      {isSavePopupOpen && (
        <SavedQueryPopup
          projectId={projectId}
          initialSqlSnippet={sqlDraftToSave}
          onClose={() => setIsSavePopupOpen(false)}
          onSaved={() => {
            window.dispatchEvent(
              new CustomEvent("savedQueries:refresh", {
                detail: { projectId },
              })
            );
          }}
        />
      )}
      <section className="flex items-center justify-between py-1 px-6">
        <div className="flex items-center gap-6 ">
          <MdAutorenew size={18} className="text-neutral-400" />
          <RiDownloadFill size={18} className="text-neutral-400" />
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-2xl border border-neutral-600 px-4 text-sm font-semibold text-neutral-200 transition hover:border-orange-500 hover:text-orange-400 hover:cursor-pointer flex items-center gap-2"
        >
          <FaBackward />
          Wróć do listy
        </button>
      </section>
      <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-neutral-950/50 border border-neutral-600/50 rounded-2xl">
        <div className="flex flex-col gap-12 px-16">
          {messages.length === 0 && (
            <p className="text-sm text-neutral-500">
              Brak wiadomości. Napisz coś, aby rozpocząć rozmowę.
            </p>
          )}
          {messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-4">
              <p
                className={
                  message.role === "user"
                    ? "bg-neutral-800 self-end w-fit max-w-2/3 py-2 px-4 text-neutral-300/80 border border-neutral-600/60 rounded-b-2xl rounded-tl-2xl text-sm"
                    : "w-full text-neutral-200/80 border-l-2 pl-3 border-amber-400/60 font-semibold text-sm rounded-xs"
                }
              >
                {message.content}
              </p>
              {message.sqlDraft && (
                <div className="py-2 px-3 bg-neutral-800 rounded-xl border border-neutral-600 font-mono text-xs text-neutral-200 whitespace-pre-wrap relative ">
                  {renderSql(message.sqlDraft)}
                  <button
                    className="absolute top-2 right-2 hover:cursor-pointer hover:bg-neutral-700 p-1 rounded-lg"
                    onClick={() => {
                      setSqlDraftToSave(message.sqlDraft || "");
                      setIsSavePopupOpen(true);
                    }}
                  >
                    <CiSaveDown2 size={20} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 flex items-center justify-center bg-neutral-800/50 border rounded-xl border-neutral-600">
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              sendMessageToAi();
            }
          }}
          placeholder="Zapytaj AI"
          className="w-3/4 mx outline-none border border-neutral-300/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold focus:ring-2 focus:ring-neutral-500/40 transition text-neutral-300"
        />
        <button
          onClick={sendMessageToAi}
          disabled={isSending || !userMessage.trim()}
          className={`ml-4 rounded-2xl border px-4 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 ${
            userMessage.trim() && !isSending
              ? "border-orange-400/60 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30"
              : "border-neutral-600 bg-neutral-700/40 text-neutral-400 cursor-not-allowed"
          }`}
        >
          {isSending ? "Wysyłanie..." : "Wyślij"}
        </button>
      </div>
    </div>
  );
};

export default Chat;
