import 'styled-components';
import { ThemeType } from './Colors';

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {}
}

declare module 'styled-components/native' {
  export interface DefaultTheme extends ThemeType {}
}