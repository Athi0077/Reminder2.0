const Skeleton = ({ className = '', type = 'card' }) => {
  if (type === 'card') {
    return (
      <div className={`bg-white p-6 rounded-2xl border border-slate-200 animate-pulse ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-200"></div>
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-3 bg-slate-100 rounded w-1/2"></div>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <div className="h-9 flex-1 bg-slate-100 rounded-lg"></div>
          <div className="h-9 flex-1 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (type === 'list-item') {
    return (
      <div className={`bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center animate-pulse ${className}`}>
        <div className="flex items-center gap-4 w-full">
          <div className="w-5 h-5 rounded bg-slate-200"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-3 bg-slate-100 rounded w-1/5"></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-6 rounded-full bg-slate-100"></div>
          <div className="w-8 h-8 rounded-full bg-slate-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-pulse bg-slate-200 rounded-lg ${className}`}></div>
  );
};

export default Skeleton;
