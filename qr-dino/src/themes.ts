export interface Theme {
  id: string;
  label: string;
  dots: string;
  bg: string;
  corners: string;
  cornersDot: string;
  previewDot: string;
  previewBg: string;
}

export const themes: Theme[] = [
  {
    id: 'classic',
    label: 'Classic',
    dots: '#18181b',
    bg: '#ffffff',
    corners: '#18181b',
    cornersDot: '#18181b',
    previewDot: '#18181b',
    previewBg: '#f4f4f5',
  },
  {
    id: 'dino',
    label: 'Dino',
    dots: '#14532d',
    bg: '#f0fdf4',
    corners: '#166534',
    cornersDot: '#15803d',
    previewDot: '#14532d',
    previewBg: '#dcfce7',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    dots: '#9a3412',
    bg: '#fff7ed',
    corners: '#c2410c',
    cornersDot: '#ea580c',
    previewDot: '#9a3412',
    previewBg: '#fed7aa',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    dots: '#1e3a8a',
    bg: '#eff6ff',
    corners: '#1d4ed8',
    cornersDot: '#2563eb',
    previewDot: '#1e3a8a',
    previewBg: '#bfdbfe',
  },
  {
    id: 'slate',
    label: 'Slate',
    dots: '#1e293b',
    bg: '#f8fafc',
    corners: '#334155',
    cornersDot: '#475569',
    previewDot: '#1e293b',
    previewBg: '#e2e8f0',
  },
];
