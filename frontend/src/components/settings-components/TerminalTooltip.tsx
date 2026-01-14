import { useState, useEffect } from "react";
import { FiEdit2, FiTrash2, FiCheck } from "react-icons/fi";

type TerminalTooltipProps = {
  x: number;
  y: number;
  initialName: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
};

const TerminalTooltip = ({
  x,
  y,
  initialName,
  onMouseEnter,
  onMouseLeave,
  onRename,
  onDelete,
}: TerminalTooltipProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(initialName);

  useEffect(() => {
    setVal(initialName);
    setIsEditing(false);
  }, [initialName]);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-50 flex items-center gap-1 p-1.5 rounded-md bg-neutral-900 border border-neutral-700 shadow-xl"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -115%)", 
      }}
    >
      {isEditing ? (
        <>
          <input
            autoFocus
            className="w-24 bg-neutral-800 text-orange-100 text-xs px-1.5 py-1 rounded border border-neutral-600 focus:border-orange-400 focus:outline-none"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
                if(e.key === 'Enter') onRename(val);
            }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename(val);
            }}
            className="p-1 rounded bg-neutral-800 text-green-400 hover:bg-neutral-700 transition"
          >
            <FiCheck size={14} />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1.5 rounded bg-neutral-800 text-neutral-400 hover:text-orange-300 hover:bg-neutral-700 transition"
          >
            <FiEdit2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded bg-neutral-800 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition"
          >
            <FiTrash2 size={14} />
          </button>
        </>
      )}

      <div className="absolute left-1/2 bottom-[-5px] -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-neutral-700"></div>
    </div>
  );
};

export default TerminalTooltip;