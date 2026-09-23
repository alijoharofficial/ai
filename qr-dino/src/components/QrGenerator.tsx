import { useState, useEffect, useRef, useCallback } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { dinos, svgToDataUrl } from '../dinos';
import { themes } from '../themes';

const DEFAULT_URL = 'https://alijohar.work';
const QR_SIZE = 300;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default function QrGenerator() {
  const [inputVal, setInputVal] = useState('');
  const [activeUrl, setActiveUrl] = useState(DEFAULT_URL);
  const [error, setError] = useState('');
  const [dinoId, setDinoId] = useState('trex');
  const [themeId, setThemeId] = useState('classic');
  const [copied, setCopied] = useState(false);
  const [qrKey, setQrKey] = useState(0); // forces fade-in re-trigger

  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dino = dinos.find(d => d.id === dinoId) ?? dinos[0];
  const theme = themes.find(t => t.id === themeId) ?? themes[0];

  const buildOptions = useCallback(
    (url: string) => ({
      width: QR_SIZE,
      height: QR_SIZE,
      data: url || DEFAULT_URL,
      image: svgToDataUrl(dino.svg),
      qrOptions: { errorCorrectionLevel: 'H' as const },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.28,
        margin: 6,
        crossOrigin: 'anonymous' as const,
      },
      dotsOptions: { color: theme.dots, type: 'rounded' as const },
      cornersSquareOptions: { type: 'extra-rounded' as const, color: theme.corners },
      cornersDotOptions: { type: 'dot' as const, color: theme.cornersDot },
      backgroundOptions: { color: theme.bg },
    }),
    [dino, theme],
  );

  // Create / recreate QR instance when container is ready or options change
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    const qr = new QRCodeStyling(buildOptions(activeUrl));
    qr.append(containerRef.current);
    qrRef.current = qr;
    setQrKey(k => k + 1);
  }, [activeUrl, dinoId, themeId, buildOptions]);

  // Debounced live preview as user types
  const handleInput = (val: string) => {
    setInputVal(val);
    setError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!val.trim()) return;
      const url = normalizeUrl(val);
      if (isValidUrl(url)) setActiveUrl(url);
    }, 350);
  };

  const handleGenerate = () => {
    if (!inputVal.trim()) {
      setError('Please enter a URL.');
      return;
    }
    const url = normalizeUrl(inputVal);
    if (!isValidUrl(url)) {
      setError('That doesn\'t look like a valid URL.');
      return;
    }
    setError('');
    setActiveUrl(url);
    setInputVal(url);
  };

  const handleDownload = (ext: 'png' | 'svg') => {
    qrRef.current?.download({ name: `qr-dino-${Date.now()}`, extension: ext });
  };

  const handleCopy = async () => {
    if (!qrRef.current) return;
    try {
      const blob = await qrRef.current.getRawData('png');
      if (!blob) throw new Error('no blob');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not supported — fall back to download
      handleDownload('png');
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      {/* ── Left panel: controls ── */}
      <div className="flex flex-col gap-6">
        {/* URL input */}
        <div>
          <label htmlFor="url-input" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Website URL
          </label>
          <div className="flex gap-2">
            <input
              id="url-input"
              type="url"
              value={inputVal}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="https://example.com"
              autoComplete="off"
              spellCheck={false}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 transition-colors
                ${error
                  ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-300'
                  : 'border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-green-400 focus:border-green-400'
                } outline-none`}
            />
            <button
              onClick={handleGenerate}
              className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-semibold transition-all"
            >
              Generate
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-1.5 text-xs text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Dino selector */}
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Choose your dinosaur
          </p>
          <div className="grid grid-cols-4 gap-2">
            {dinos.map(d => (
              <button
                key={d.id}
                onClick={() => setDinoId(d.id)}
                aria-label={d.name}
                aria-pressed={dinoId === d.id}
                className={`group relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 p-2 transition-all
                  ${dinoId === d.id
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/40 shadow-sm shadow-green-200 dark:shadow-green-900'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
              >
                <span
                  className="w-full aspect-square"
                  dangerouslySetInnerHTML={{ __html: d.svg }}
                />
                <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 leading-none">
                  {d.name}
                </span>
                {dinoId === d.id && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Color theme selector */}
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Color theme
          </p>
          <div className="flex gap-2 flex-wrap">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                aria-label={t.label}
                aria-pressed={themeId === t.id}
                title={t.label}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                  ${themeId === t.id
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.previewBg} 50%, ${t.previewDot} 50%)` }}
                  aria-hidden="true"
                />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Download / copy buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleDownload('png')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-semibold transition-all"
          >
            <DownloadIcon />
            PNG
          </button>
          <button
            onClick={() => handleDownload('svg')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-all"
          >
            <DownloadIcon />
            SVG
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-all"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Right panel: QR preview ── */}
      <div className="flex flex-col items-center gap-4 order-first md:order-last">
        <div
          className="rounded-2xl p-4 shadow-lg border border-zinc-200 dark:border-zinc-800"
          style={{ background: theme.bg }}
        >
          <div
            key={qrKey}
            id="qr-container"
            ref={containerRef}
            className="animate-qr-in"
            style={{ width: QR_SIZE, height: QR_SIZE }}
            aria-label="QR code preview"
          />
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-600 text-center max-w-xs">
          Scan with any camera app · works offline · high error-correction
        </p>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
