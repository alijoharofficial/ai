import { useState, useEffect } from 'react';
import Header from './components/Header';
import QrGenerator from './components/QrGenerator';

function App() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('qr-dino-theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('qr-dino-theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      <Header dark={dark} onToggle={() => setDark(d => !d)} />

      <main className="max-w-5xl mx-auto px-4 pb-20">
        {/* Hero */}
        <section className="text-center pt-14 pb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 mb-5">
            <span aria-hidden="true">🦕</span> Free · No signup · Works offline
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
            QR Code Dinosaur
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Generate scannable QR codes with your favorite prehistoric friend stomping around in the center.
          </p>
        </section>

        {/* Generator */}
        <section
          aria-label="QR code generator"
          className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 sm:p-8"
        >
          <QrGenerator />
        </section>

        {/* How it works strip */}
        <section className="mt-16">
          <h2 className="text-center text-sm font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest mb-8">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: '🔗', title: 'Paste your URL', desc: 'Type or paste any website address. We auto-add https:// if needed.' },
              { icon: '🦕', title: 'Pick a dino', desc: 'Choose your favourite dinosaur and a color theme that fits your vibe.' },
              { icon: '⬇️', title: 'Download & share', desc: 'Export as PNG or SVG. High error-correction keeps it scannable every time.' },
            ].map(s => (
              <div key={s.title} className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <span className="text-3xl" aria-hidden="true">{s.icon}</span>
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">{s.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
        QR Code Dinosaur · No tracking, no ads, no nonsense ·{' '}
        <a href="https://alijohar.work" className="hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors underline">
          alijohar.work
        </a>
      </footer>
    </div>
  );
}

export default App;
