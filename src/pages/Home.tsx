import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-white selection:bg-primary-500 selection:text-white flex flex-col items-center justify-center p-8">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

      <main className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm -mb-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium tracking-wide text-slate-300">Vibe Coding Active</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-linear-to-br from-white via-slate-200 to-slate-500 pb-2">
          Antigravity UI
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
          The ultimate spine-first architecture playground. Built with React, Vite, and absolute design precision using Tailwind v4.
        </p>

        <div className="flex items-center justify-center gap-6 pt-8">
          <button className="px-8 py-4 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-500 transition-all active:scale-95 shadow-[0_0_40px_-10px_var(--color-primary-600)]">
            Start Building
          </button>
          <button className="px-8 py-4 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all border border-white/10 active:scale-95">
            Read Docs
          </button>
        </div>
      </main>

    </div>
  );
};

export default Home;
