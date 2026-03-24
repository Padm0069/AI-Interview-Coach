import { extendTheme } from '@chakra-ui/react';

// ── Chakra UI theme — dark GitHub-inspired palette with cyan accent ──
const theme = extendTheme({
  styles: { global: { body: { bg: '#0D1117', color: 'white' } } },
  fonts: {
    heading: `'DM Sans', sans-serif`,
    body: `'DM Sans', sans-serif`,
  },
  colors: {
    brand: { 500: '#00E5FF', 600: '#00B8D4' },
    surface: { 100: '#161B22', 200: '#21262D', 300: '#30363D' },
  },
});

export default theme;