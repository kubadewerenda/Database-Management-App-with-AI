const ColorPanel = () => {
  return (
    <div className="bg-neutral-900/90 z-50 border border-neutral-400/30 absolute -top-10 left-22 flex flex-col p-4 rounded-3xl gap-2">
      <div className="flex gap-2">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-yellow-400/20"></div>
        <div className="w-10 h-10 bg-orange-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-orange-400/20"></div>
        <div className="w-10 h-10 bg-rose-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-rose-400/20"></div>
      </div>
      <div className="flex gap-2">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-emerald-400/20"></div>
        <div className="w-10 h-10 bg-fuchsia-500/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-fuchsia-400/20"></div>
        <div className="w-10 h-10 bg-white/20 rounded-xl border border-neutral-500 hover:cursor-pointer hover:bg-white-400/20"></div>
      </div>
    </div>
  );
};

export default ColorPanel;
