import { projectOverview } from "../../api/projectDetailsApi";
import { useEffect, useState } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { FaKey, FaTable } from "react-icons/fa";

type DbSchema = {
  name: string;
  schema: string;
  columns: {
    name: string;
    dataType: string;
    isNullable: string;
    defaultValue: boolean;
    isForeignKey: boolean;
  }[];
  commend: string;
};

const ResizableDetails = ({ id }: { id: number }) => {
  const [database, setDatabase] = useState<DbSchema[]>([]);

  useEffect(() => {
    const handleFetchingData = async () => {
      if (!id) return;
      try {
        const response = await projectOverview(id);
        setDatabase(response.projectOverview.schema.tables);
      } catch (e) {
        console.error("Błąd pobierania schematu", e);
      }
    };

    handleFetchingData();
  }, [id]);

  return (
    <PanelGroup direction="horizontal" className="h-full gap-2">
      <Panel
        defaultSize={50}
        minSize={30}
        className="bg-neutral-950/50 h-full p-4 rounded-2xl border border-neutral-600/50"
      >
        <div className="h-full overflow-y-auto pr-2">
          <div className="flex flex-wrap gap-4 items-start content-start">
            {database.map((table, index) => (
              <div
                key={index}
                className="flex flex-col w-64 bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm hover:shadow-md hover:border-neutral-600 transition-all duration-200 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800/50 border-b border-neutral-700">
                  <FaTable className="text-orange-400/80" />
                  <h3
                    className="font-semibold text-sm text-neutral-300 truncate"
                    title={table.name}
                  >
                    {table.name}
                  </h3>
                </div>
                <div className="flex flex-col py-1">
                  {table.columns.map((col, colIndex) => (
                    <div
                      key={colIndex}
                      className={`group flex items-center justify-between px-3 py-1.5 text-xs border-b border-transparent hover:bg-neutral-800/80 ${
                        colIndex % 2 === 0
                          ? "bg-neutral-800/70"
                          : "bg-neutral-900/30"
                      }`}
                    >
                      <div className="flex items-center gap-1 overflow-hidden">
                        {col.isForeignKey && (
                          <FaKey className="text-amber-300" size={10} />
                        )}

                        <span
                          className={`truncate ${
                            col.isForeignKey
                              ? "text-yellow-100"
                              : "text-neutral-400"
                          }`}
                        >
                          {col.name}
                        </span>
                      </div>

                      <span className="font-mono text-neutral-500 ml-2 whitespace-nowrap text-[10px]">
                        {col.dataType}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1 bg-neutral-900 border-t border-neutral-800 text-[10px] text-neutral-500 text-right">
                  {table.columns.length} columns
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <PanelResizeHandle className="w-1 bg-neutral-700 hover:bg-orange-500/50 transition-colors rounded-full mx-1" />

      <Panel
        defaultSize={50}
        minSize={30}
        className="bg-neutral-950 h-full flex flex-col rounded-2xl border border-neutral-800 overflow-hidden"
      ></Panel>
    </PanelGroup>
  );
};

export default ResizableDetails;
