import 'styled-components';
import type { Theme } from './contexts/ThemeContext';

declare module 'styled-components' {
  export type DefaultTheme = Theme;
}
