import { useEffect, useState } from "react";
import { chatHistory } from "../../api/projectDetailsApi";
import { FaBackward } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { MdAutorenew } from "react-icons/md";
import { RiDownloadFill } from "react-icons/ri";
import { sendMessage } from "../../api/projectDetailsApi";

type chatMessages = {
  id: number;
  role: string;
  content: string;
  sqlDraft: string;
  createdAt: string;
};

const Chat = ({ id }: { id: number }) => {
  const [chatMessages, setChatMessages] = useState<chatMessages[]>([]);

  const [userMessage, setUserMessage] = useState("");

  const navigate = useNavigate();

  const sendMessageToAi = async () => {
    const response = await sendMessage(id, userMessage);
    console.log(response);
    setUserMessage("");
    const fetchChatHistory = async () => {
      const response = await chatHistory(id);
      console.log(response.messages);
      setChatMessages(response.messages);
    };
    fetchChatHistory();
  };

  useEffect(() => {
    const fetchChatHistory = async () => {
      const response = await chatHistory(id);
      console.log(response.messages);
      setChatMessages(response.messages);
    };
    fetchChatHistory();
  }, [id]);

  return (
    <div className="h-full flex flex-col gap-1">
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
      <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-neutral-950/50 border  border-neutral-600/50 rounded-2xl">
        <div className="flex flex-col gap-12 px-16 ">
          {chatMessages.map((element, index) => (
            <div key={index} className="flex flex-col gap-4">
              <p
                className={`${
                  element.role === "user"
                    ? "bg-neutral-800 self-end w-fit max-w-2/3 py-2 px-4 text-neutral-300/80 border border-neutral-600/60 rounded-b-2xl rounded-tl-2xl text-sm"
                    : "w-full text-neutral-300/70 border-l-2 pl-3 border-amber-500/60 font-semibold text-sm rounded-xs"
                }`}
              >
                {element.content}
              </p>
            </div>
          ))}
        </div>
      </div>
      {/* <div className="w-full h-16 bg-black/40 backdrop-blur-md border-b border-white/10"></div> */}
      {/* <div className="w-full h-px bg-neutral-400 border-x border-neutral-400"></div> */}
      <div className="p-4   flex items-center justify-center bg-neutral-800/50">
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="Zapytaj AI"
          className="w-3/4 mx outline-none border border-neutral-300/40 bg-neutral-800/80 rounded-2xl px-3 py-2 font-semibold focus:ring-2 focus:ring-neutral-500/40 transition text-neutral-300"
        />
        <button onClick={sendMessageToAi}>WYSLIJ</button>
      </div>
    </div>
  );
};

export default Chat;
