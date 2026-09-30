interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace('#', '');
  
  // Handle shorthand hex like "F00" or "#F00"
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return { r, g, b };
}

function rgbToHex({ r, g, b }: RGB): string {
  const d2h = (d: number) => Math.max(0, Math.min(255, Math.round(d))).toString(16).padStart(2, '0');
  return `#${d2h(r)}${d2h(g)}${d2h(b)}`;
}

function mixRgb(c1: RGB, c2: RGB, weight: number): RGB {
  return {
    r: Math.round(c1.r * weight + c2.r * (1 - weight)),
    g: Math.round(c1.g * weight + c2.g * (1 - weight)),
    b: Math.round(c1.b * weight + c2.b * (1 - weight)),
  };
}

export function updateThemeColors(
  primaryHex: string | undefined, 
  secondaryHex: string | undefined,
  bgHex?: string | undefined
) {
  const defaultPrimary = '#ea580c'; // default orange-600
  const defaultSecondary = '#f97316'; // default orange-500
  const defaultBg = '#fff7f4'; // default soft warm cream background

  const primary = primaryHex && primaryHex.trim() !== '' ? primaryHex : defaultPrimary;
  const secondary = secondaryHex && secondaryHex.trim() !== '' ? secondaryHex : defaultSecondary;
  const bg = bgHex && bgHex.trim() !== '' ? bgHex : defaultBg;

  try {
    const root = document.documentElement;
    root.style.setProperty('--site-bg-color', bg);
    document.body.style.backgroundColor = bg;

    const primaryRgb = hexToRgb(primary);
    const secondaryRgb = hexToRgb(secondary);

    const white: RGB = { r: 255, g: 255, b: 255 };
    const black: RGB = { r: 0, g: 0, b: 0 };

    const setCssVars = (prefix: 'primary' | 'secondary', baseRgb: RGB) => {
      const root = document.documentElement;

      // Shades definitions matching standard Tailwind scale weights
      const shades = {
        '50': mixRgb(baseRgb, white, 0.05),
        '100': mixRgb(baseRgb, white, 0.15),
        '200': mixRgb(baseRgb, white, 0.35),
        '300': mixRgb(baseRgb, white, 0.55),
        '400': mixRgb(baseRgb, white, 0.80),
        '500': baseRgb,
        '600': mixRgb(baseRgb, black, 0.85),
        '700': mixRgb(baseRgb, black, 0.70),
        '800': mixRgb(baseRgb, black, 0.55),
        '900': mixRgb(baseRgb, black, 0.40),
        '950': mixRgb(baseRgb, black, 0.25),
      };

      Object.entries(shades).forEach(([shade, rgb]) => {
        const hex = rgbToHex(rgb);
        root.style.setProperty(`--color-${prefix}-${shade}`, hex);
        root.style.setProperty(`--color-${prefix}-${shade}-rgb`, `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      });
    };

    setCssVars('primary', primaryRgb);
    setCssVars('secondary', secondaryRgb);
  } catch (error) {
    console.error('Error updating theme colors:', error);
  }
}
