const ColorPanel = ({ setColor }: { setColor: (value: string) => void }) => {
  const handleColorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button");

    if (!button || !event.currentTarget.contains(button)) {
      return;
    }

    const actionId = button.dataset.id;

    if (actionId) {
      setColor(actionId);
    }
  };

  return (
    <div className="bg-neutral-900/90 z-50 border border-neutral-400/30 absolute -top-10 left-22 flex flex-col p-4 rounded-3xl gap-2">
      <div className="flex flex-col gap-2" onClick={handleColorClick}>
        <div className="flex gap-2">
          <button
            data-id="#eab308"
            className="w-10 h-10 bg-yellow-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-yellow-400/20"
          ></button>
          <button
            data-id="#f97316"
            className="w-10 h-10 bg-orange-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-orange-400/20"
          ></button>
          <button
            data-id="#f43f5e"
            className="w-10 h-10 bg-rose-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-rose-400/20"
          ></button>
        </div>

        <div className="flex gap-2">
          <button
            data-id="#10b981"
            className="w-10 h-10 bg-emerald-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-emerald-400/20"
          ></button>
          <button
            data-id="#d946ef"
            className="w-10 h-10 bg-fuchsia-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-fuchsia-400/20"
          ></button>
          <button
            data-id="#ffffff"
            className="w-10 h-10 bg-white/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-white/40"
          ></button>
        </div>
      </div>
    </div>
  );
};

export default ColorPanel;
