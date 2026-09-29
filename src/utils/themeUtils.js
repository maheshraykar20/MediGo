// Color Theme Utility for MedVault Pro

export const THEME_PRESETS = [
  {
    id: 'teal',
    nameEn: 'Clinical Teal',
    nameMr: 'क्लीनिकल टील (मूळ)',
    color: '#0d9488',
    hover: '#0f766e',
    light: '#f0fdfa',
    border: '#99f6e4',
    ring: 'rgba(13, 148, 136, 0.35)',
  },
  {
    id: 'blue',
    nameEn: 'Royal Sapphire',
    nameMr: 'रॉयल निळा (Royal Blue)',
    color: '#2563eb',
    hover: '#1d4ed8',
    light: '#eff6ff',
    border: '#bfdbfe',
    ring: 'rgba(37, 99, 235, 0.35)',
  },
  {
    id: 'emerald',
    nameEn: 'Emerald Green',
    nameMr: 'पाचू हिरवा (Emerald)',
    color: '#059669',
    hover: '#047857',
    light: '#ecfdf5',
    border: '#a7f3d0',
    ring: 'rgba(5, 150, 105, 0.35)',
  },
  {
    id: 'violet',
    nameEn: 'Royal Violet',
    nameMr: 'रॉयल जांभळा (Violet)',
    color: '#7c3aed',
    hover: '#6d28d9',
    light: '#f5f3ff',
    border: '#ddd6fe',
    ring: 'rgba(124, 58, 237, 0.35)',
  },
  {
    id: 'rose',
    nameEn: 'Crimson Rose',
    nameMr: 'रुबी रोज (Rose)',
    color: '#e11d48',
    hover: '#be123c',
    light: '#fff1f2',
    border: '#fecdd3',
    ring: 'rgba(225, 29, 72, 0.35)',
  },
  {
    id: 'amber',
    nameEn: 'Warm Amber',
    nameMr: 'सोनेरी अंबर (Amber)',
    color: '#d97706',
    hover: '#b45309',
    light: '#fffbeb',
    border: '#fde68a',
    ring: 'rgba(217, 119, 6, 0.35)',
  },
  {
    id: 'indigo',
    nameEn: 'Deep Indigo',
    nameMr: 'गहिरा इंडिगो (Indigo)',
    color: '#4f46e5',
    hover: '#4338ca',
    light: '#eef2ff',
    border: '#c7d2fe',
    ring: 'rgba(79, 70, 229, 0.35)',
  },
  {
    id: 'slate',
    nameEn: 'Modern Slate',
    nameMr: 'मॉडर्न स्लेट (Slate)',
    color: '#334155',
    hover: '#1e293b',
    light: '#f8fafc',
    border: '#cbd5e1',
    ring: 'rgba(51, 65, 85, 0.35)',
  },
];

// Helper to convert hex to RGB
function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex.length === 3 
    ? cleanHex.split('').map(c => c + c).join('') 
    : cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

// Generate complete theme palette from any custom hex color
export function generateCustomTheme(hexColor, nameEn = 'Custom Theme', nameMr = 'स्वतःचा रंग') {
  if (!hexColor || !/^#[0-9A-Fa-f]{3,6}$/.test(hexColor)) {
    return THEME_PRESETS[0];
  }

  const { r, g, b } = hexToRgb(hexColor);

  // Darker shade for hover (15% darker)
  const hoverR = Math.max(0, Math.floor(r * 0.82));
  const hoverG = Math.max(0, Math.floor(g * 0.82));
  const hoverB = Math.max(0, Math.floor(b * 0.82));
  const hoverHex = `#${((1 << 24) + (hoverR << 16) + (hoverG << 8) + hoverB).toString(16).slice(1)}`;

  // Very light tint for card background and pills
  const lightBg = `rgba(${r}, ${g}, ${b}, 0.08)`;
  // Soft border tint
  const borderTint = `rgba(${r}, ${g}, ${b}, 0.28)`;
  // Ring glow
  const ringGlow = `rgba(${r}, ${g}, ${b}, 0.35)`;

  return {
    id: 'custom',
    nameEn,
    nameMr,
    color: hexColor,
    hover: hoverHex,
    light: lightBg,
    border: borderTint,
    ring: ringGlow,
    isCustom: true,
  };
}

// Apply the theme to the entire document
export function applyDashboardTheme(theme) {
  if (typeof document === 'undefined') return;

  const currentTheme = theme?.color ? theme : THEME_PRESETS[0];

  let styleTag = document.getElementById('medvault-dynamic-theme-styles');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'medvault-dynamic-theme-styles';
    document.head.appendChild(styleTag);
  }

  styleTag.innerHTML = `
    :root {
      --theme-primary: ${currentTheme.color};
      --theme-hover: ${currentTheme.hover};
      --theme-light: ${currentTheme.light};
      --theme-border: ${currentTheme.border};
      --theme-ring: ${currentTheme.ring};
    }

    /* Primary Buttons & Solid Accents */
    .bg-teal-600, .bg-teal-700 {
      background-color: var(--theme-primary) !important;
    }
    .hover\\:bg-teal-700:hover, .hover\\:bg-teal-800:hover {
      background-color: var(--theme-hover) !important;
    }

    /* Text Accents */
    .text-teal-600, .text-teal-700, .text-teal-800 {
      color: var(--theme-primary) !important;
    }
    .hover\\:text-teal-700:hover, .hover\\:text-teal-900:hover {
      color: var(--theme-hover) !important;
    }
    .text-teal-950, .text-teal-900 {
      color: var(--theme-hover) !important;
    }

    /* Light backgrounds & Badges */
    .bg-teal-50, .bg-teal-50\\/80, .bg-teal-100 {
      background-color: var(--theme-light) !important;
    }

    /* Borders */
    .border-teal-200, .border-teal-200\\/80, .border-teal-300, .border-teal-500\\/30, .border-teal-500\\/40 {
      border-color: var(--theme-border) !important;
    }

    /* Form Focus Rings & Outlines */
    .focus\\:ring-teal-500\\/30:focus {
      --tw-ring-color: var(--theme-ring) !important;
    }
    .focus\\:border-teal-500:focus {
      border-color: var(--theme-primary) !important;
    }

    /* Shadows & Selection */
    .shadow-teal-600\\/30, .shadow-teal-600\\/20, .shadow-teal-500\\/20 {
      --tw-shadow-color: var(--theme-ring) !important;
    }
    ::selection {
      background-color: var(--theme-primary) !important;
      color: #ffffff !important;
    }
  `;
}
