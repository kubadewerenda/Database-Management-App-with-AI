import { useEffect, useState } from "react";
import {
  fetchTerminals,
  createTerminal,
  fetchExecutor,
  executeSql,
} from "../../api/projectDetailsApi";
import { useParams } from "react-router-dom";
import { IoChevronDown, IoChevronUp, IoPlay } from "react-icons/io5";

type HistoryItem = {
  id: number;
  sql: string;
  createdAt: string;
};

const Executors = () => {
  const { projectId } = useParams();
  const id = Number(projectId);

  const [isOpen, setIsOpen] = useState(false);
  const [terminalId, setTerminalId] = useState<number | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sql, setSql] = useState("");
  const [result, setResult] = useState(null);

  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    const initTerminal = async () => {
      try {
        const data = await fetchTerminals(id);
        const list = data?.executors ?? [];
        if (list.length > 0) {
          setTerminalId(list[0].id);
        } else {
          try {
            const newTerm = await createTerminal(id);
            if (newTerm?.executor?.id) {
              setTerminalId(newTerm.executor.id);
            } else {
              const refreshed = await fetchTerminals(id);
              if (refreshed?.executors?.length > 0) {
                setTerminalId(refreshed.executors[0].id);
              }
            }
          } catch {
            const refreshed = await fetchTerminals(id);
            if (refreshed?.executors?.length > 0) {
              setTerminalId(refreshed.executors[0].id);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (isOpen) {
      initTerminal();
    }
  }, [id, isOpen]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!terminalId) return;
      const data = await fetchExecutor(id, terminalId);
      if (data?.executor?.history) {
        setHistory(data.executor.history);
        setHistoryIndex(data.executor.history.length);
      }
    };
    loadHistory();
  }, [id, terminalId]);

  const onExecute = async () => {
    if (!sql.trim() || !terminalId) return;
    try {
      const res = await executeSql(id, terminalId, sql);
      setResult(res);
      const data = await fetchExecutor(id, terminalId);
      if (data?.executor?.history) {
        setHistory(data.executor.history);
        setHistoryIndex(data.executor.history.length);
      }
      setSql("");
    } catch {
      setResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      onExecute();
      return;
    }

    if (history.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      if (history[newIndex]) {
        setSql(history[newIndex].sql);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = Math.min(history.length, historyIndex + 1);
      setHistoryIndex(newIndex);
      if (newIndex === history.length) {
        setSql("");
      } else if (history[newIndex]) {
        setSql(history[newIndex].sql);
      }
    }
  };

  return (
    <div className="rounded-xl border border-neutral-700/60 bg-neutral-900/60 text-neutral-200 transition relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 hover:text-orange-300 transition"
      >
        <span className="text-xs font-semibold text-neutral-300">Terminal</span>
        {isOpen ? (
          <IoChevronDown className="text-neutral-400" size={18} />
        ) : (
          <IoChevronUp className="text-neutral-400" size={18} />
        )}
      </button>

      {isOpen && terminalId && (
        <div className="h-96 overflow-y-auto border-t border-neutral-700/60 p-3 bg-neutral-950/40 flex flex-col gap-4">
          <div className="flex-1 overflow-y-auto bg-neutral-900/50 rounded p-2 text-xs font-mono space-y-1 scrollbar-thin scrollbar-thumb-neutral-700">
            {result ? (
              <div className="text-xs">
                <div className="mb-2 font-semibold text-green-400">
                  Execution Result:
                </div>
                <div className="overflow-x-auto">
                  <pre className="whitespace-pre text-neutral-300">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-neutral-500 italic text-center mt-10">
                Run a query to see results...
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-orange-500/50 resize-none h-20"
              placeholder="SELECT * FROM... (Up/Down for history)"
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={onExecute}
              className="px-3 bg-orange-600/20 border border-orange-500/40 text-orange-200 rounded hover:bg-orange-600/30 transition flex items-center justify-center"
              title="Run SQL (Ctrl+Enter)"
            >
              <IoPlay size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Executors;
