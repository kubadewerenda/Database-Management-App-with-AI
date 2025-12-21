import { useEffect, useState, useRef } from "react";
import {
  fetchTerminals,
  createTerminal,
  renameTerminal,
  deleteTerminal,
} from "../../api/projectDetailsApi";
import { useParams } from "react-router-dom";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import TerminalTooltip from "../settings-components/TerminalTooltip";

type ExecutorItem = {
  id: number;
  projectId: number;
  name: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

// Dodajemy 'name', żeby przekazać ją do inputa w tooltipie
type TooltipData = {
  id: number;
  name: string;
  x: number;
  y: number;
} | null;

const Executors = () => {
  const { projectId } = useParams();
  const id = Number(projectId);

  const [executors, setExecutors] = useState<ExecutorItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTerminal, setActiveTerminal] = useState(0);

  const [tooltipData, setTooltipData] = useState<TooltipData>(null);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loadExecutors = async () => {
      const data = await fetchTerminals(id);
      setExecutors(data?.executors ?? []);
    };
    loadExecutors();
  }, [id]);

  const onCreateTerminal = async () => {
    try {
      await createTerminal(id);
      const data = await fetchTerminals(id);
      setExecutors(data?.executors ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  // --- OBSŁUGA MYSZKI ---

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    termId: number,
    termName: string
  ) => {
    // Jeśli wjeżdżamy na element, anulujemy zamykanie
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipData({
      id: termId,
      name: termName,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => {
    // Opóźnienie, żeby zdążyć najechać na tooltip
    closeTimeoutRef.current = setTimeout(() => {
      setTooltipData(null);
    }, 300) as unknown as number;
  };

  const handleTooltipEnter = () => {
    // Jeśli jesteśmy nad tooltipem, nie zamykaj go
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // --- LOGIKA BIZNESOWA (PROSTA) ---

  const handleRename = async (newName: string) => {
    if (!tooltipData) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await renameTerminal(id, tooltipData.id, trimmed);
      const data = await fetchTerminals(id);
      setExecutors(data?.executors ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setTooltipData(null); // Zamykamy dymek po akcji
    }
  };

  const handleDelete = async () => {
    if (!tooltipData) return;
    try {
      await deleteTerminal(id, tooltipData.id);
      const data = await fetchTerminals(id);
      const list = data?.executors ?? [];
      setExecutors(list);

      // Ustaw aktywny na pierwszy z listy, jeśli usunięty był aktywny
      if (activeTerminal === tooltipData.id) {
        setActiveTerminal(list[0]?.id ?? 0);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTooltipData(null); // Zamykamy dymek po akcji
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

      {isOpen && (
        <div className="h-96 overflow-y-auto border-t border-neutral-700/60 p-3 bg-neutral-950/40">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-nowrap scrollbar-thin scrollbar-thumb-neutral-700">
            {executors.map((element) => {
              const isActive = activeTerminal === element.id;

              return (
                <div
                  key={element.id}
                  // WAŻNE: Przekazujemy tutaj też nazwę (element.name)
                  onMouseEnter={(e) =>
                    handleMouseEnter(e, element.id, element.name)
                  }
                  onMouseLeave={handleMouseLeave}
                  onClick={() => setActiveTerminal(element.id)}
                  className={`relative px-3 py-1.5 cursor-pointer whitespace-nowrap transition border-b-2 ${
                    isActive
                      ? "border-orange-400 bg-neutral-800 rounded-t-lg"
                      : "border-transparent text-neutral-400 hover:text-neutral-200 hover:border-orange-300/30"
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? "text-orange-100" : ""
                    }`}
                  >
                    {element.name}
                  </span>
                </div>
              );
            })}

            <button
              onClick={onCreateTerminal}
              className="px-2 py-1 rounded-md font-bold text-sm border border-orange-500/70 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25 hover:border-orange-400 transition shrink-0"
            >
              +
            </button>
          </div>
        </div>
      )}

      {tooltipData && (
        <TerminalTooltip
          x={tooltipData.x}
          y={tooltipData.y}
          initialName={tooltipData.name}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleMouseLeave}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default Executors;
