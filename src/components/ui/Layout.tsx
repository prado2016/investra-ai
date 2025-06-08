import styled from 'styled-components';
import { breakpoints, media } from '../../styles/breakpoints';

// Container component for responsive layouts
export const Container = styled.div<{
  maxWidth?: keyof typeof breakpoints | 'full';
  padding?: boolean;
  center?: boolean;
}>`
  width: 100%;
  margin-left: ${props => props.center !== false ? 'auto' : '0'};
  margin-right: ${props => props.center !== false ? 'auto' : '0'};
  
  ${props => props.padding !== false && `
    padding-left: 1rem;
    padding-right: 1rem;
    
    ${media.sm} {
      padding-left: 1.5rem;
      padding-right: 1.5rem;
    }
    
    ${media.lg} {
      padding-left: 2rem;
      padding-right: 2rem;
    }
  `}
  
  ${props => {
    if (props.maxWidth && props.maxWidth !== 'full') {
      return `max-width: ${breakpoints[props.maxWidth]};`;
    }
    return '';
  }}
`;

// Grid system
export const Grid = styled.div<{
  cols?: number | string;
  gap?: string;
  responsive?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}>`
  display: grid;
  grid-template-columns: ${props => 
    typeof props.cols === 'number' 
      ? `repeat(${props.cols}, 1fr)` 
      : props.cols || '1fr'
  };
  gap: ${props => props.gap || '1rem'};
  
  ${props => props.responsive?.sm && `
    ${media.sm} {
      grid-template-columns: repeat(${props.responsive.sm}, 1fr);
    }
  `}
  
  ${props => props.responsive?.md && `
    ${media.md} {
      grid-template-columns: repeat(${props.responsive.md}, 1fr);
    }
  `}
  
  ${props => props.responsive?.lg && `
    ${media.lg} {
      grid-template-columns: repeat(${props.responsive.lg}, 1fr);
    }
  `}
  
  ${props => props.responsive?.xl && `
    ${media.xl} {
      grid-template-columns: repeat(${props.responsive.xl}, 1fr);
    }
  `}
`;

// Flex utilities
export const Flex = styled.div<{
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: string;
  responsive?: {
    sm?: 'row' | 'column';
    md?: 'row' | 'column';
    lg?: 'row' | 'column';
  };
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  flex-wrap: ${props => props.wrap || 'nowrap'};
  gap: ${props => props.gap || '0'};
  
  ${props => props.responsive?.sm && `
    ${media.sm} {
      flex-direction: ${props.responsive.sm};
    }
  `}
  
  ${props => props.responsive?.md && `
    ${media.md} {
      flex-direction: ${props.responsive.md};
    }
  `}
  
  ${props => props.responsive?.lg && `
    ${media.lg} {
      flex-direction: ${props.responsive.lg};
    }
  `}
`;

// Show/Hide utilities
export const Show = styled.div<{
  above?: keyof typeof breakpoints;
  below?: keyof typeof breakpoints;
  only?: keyof typeof breakpoints;
}>`
  ${props => {
    if (props.above) {
      return `
        display: none;
        ${media[props.above]} {
          display: block;
        }
      `;
    }
    if (props.below) {
      return `
        display: block;
        ${media[props.below]} {
          display: none;
        }
      `;
    }
    if (props.only) {
      const bp = props.only;
      const nextBp = Object.keys(breakpoints)[Object.keys(breakpoints).indexOf(bp) + 1] as keyof typeof breakpoints;
      return `
        display: none;
        ${media[bp]} {
          display: block;
        }
        ${nextBp && media[nextBp] ? `
          ${media[nextBp]} {
            display: none;
          }
        ` : ''}
      `;
    }
    return '';
  }}
`;

export const Hide = styled.div<{
  above?: keyof typeof breakpoints;
  below?: keyof typeof breakpoints;
  only?: keyof typeof breakpoints;
}>`
  ${props => {
    if (props.above) {
      return `
        display: block;
        ${media[props.above]} {
          display: none;
        }
      `;
    }
    if (props.below) {
      return `
        display: none;
        ${media[props.below]} {
          display: block;
        }
      `;
    }
    if (props.only) {
      const bp = props.only;
      const nextBp = Object.keys(breakpoints)[Object.keys(breakpoints).indexOf(bp) + 1] as keyof typeof breakpoints;
      return `
        display: block;
        ${media[bp]} {
          display: none;
        }
        ${nextBp && media[nextBp] ? `
          ${media[nextBp]} {
            display: block;
          }
        ` : ''}
      `;
    }
    return '';
  }}
`;

// Stack component for vertical layouts
export const Stack = styled.div<{
  spacing?: string;
  align?: 'start' | 'center' | 'end' | 'stretch';
}>`
  display: flex;
  flex-direction: column;
  align-items: ${props => {
    switch (props.align) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      default: return 'stretch';
    }
  }};
  
  > * + * {
    margin-top: ${props => props.spacing || '1rem'};
  }
`;
