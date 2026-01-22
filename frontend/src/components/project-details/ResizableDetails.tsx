import { projectOverview } from "../../api/projectDetailsApi";
import { useEffect, useState } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { FaKey, FaTable } from "react-icons/fa";
import Chat from "./Chat";
import { HiOutlineEye } from "react-icons/hi2";
import { HiOutlineEyeSlash } from "react-icons/hi2";
import { PuffLoader } from "react-spinners";
import Executors from "./Executors";

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

const ResizableDetails = ({
  id,
  color,
  name,
}: {
  id: number;
  color: string;
  name: string;
}) => {
  const [database, setDatabase] = useState<DbSchema[]>([]);

  const [chatId, setChatId] = useState<number | null>(null);

  const [showTablesDetails, setShowTablesDetails] = useState(true);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleFetchingData = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const response = await projectOverview(id);
        const tables = response?.projectOverview?.schema?.tables ?? [];
        setDatabase(tables);
        setChatId(response?.projectOverview?.chat?.id ?? null);
        console.log(tables);
      } catch (e) {
        console.error("Błąd pobierania schematu", e);
      } finally {
        setIsLoading(false);
      }
    };

    handleFetchingData();
  }, [id]);

  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel
        defaultSize={50}
        minSize={30}
        className=" h-full  flex flex-col gap-2"
      >
        {/* DIV NA TOOLTIP */}
        <section className="flex items-center justify-between px-6  ">
          <div className="flex items-end gap-4">
            <h1 className="text-xl font-semibold text-neutral-300">{name}</h1>
            <p className="text-neutral-400 text-xs ">
              <span>{database.length}</span> tables
            </p>
          </div>

          <div className="flex gap-6 items-center">
            {showTablesDetails ? (
              <button onClick={() => setShowTablesDetails((prev) => !prev)}>
                <HiOutlineEyeSlash
                  size={20}
                  className="text-neutral-400 hover:cursor-pointer"
                />
              </button>
            ) : (
              <button onClick={() => setShowTablesDetails((prev) => !prev)}>
                <HiOutlineEye
                  size={20}
                  className="text-neutral-400 hover:cursor-pointer"
                />
              </button>
            )}
          </div>
        </section>
        <div className="h-full overflow-y-auto pr-2 bg-neutral-950/50 rounded-2xl border border-neutral-600/50 ">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <PuffLoader color={color} size={60} />
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 items-start content-start p-3">
              {database.map((table, index) => (
                <div
                  key={index}
                  className="flex flex-col w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-sm hover:shadow-md hover:border-neutral-600 transition-all duration-200 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-neutral-950/70 border-b border-neutral-700">
                    <FaTable style={{ color: color }} />
                    <h3
                      className="font-semibold text-sm text-neutral-300 truncate"
                      title={table.name}
                    >
                      {table.name}
                    </h3>
                  </div>
                  {showTablesDetails && (
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
                              className={`truncate font-semibold ${
                                col.isForeignKey
                                  ? "text-yellow-100"
                                  : "text-neutral-400"
                              }`}
                            >
                              {col.name}
                            </span>
                          </div>

                          <span className="font-mono text-neutral-500 ml-2 whitespace-nowrap text-md">
                            {col.dataType}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-3 py-1 bg-neutral-800 border-t border-neutral-800 text-[10px] text-neutral-500 text-right">
                    {table.columns.length} columns
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Executors />
      </Panel>

      <PanelResizeHandle className="w-1 bg-transparent hover:bg-neutral-500/50 rounded-full mx-1 hover:w-1.5 transition-all" />

      <Panel
        defaultSize={50}
        minSize={30}
        className=" h-full flex flex-col relative"
      >
        <Chat projectId={id} chatId={chatId} />
      </Panel>
    </PanelGroup>
  );
};

export default ResizableDetails;
