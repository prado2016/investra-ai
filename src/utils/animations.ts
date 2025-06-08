/**
 * Styled Components Animation Helper
 * Ensures proper keyframe usage across the application
 */

import { css, keyframes } from 'styled-components';

// Common animations
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

export const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

export const slideOut = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
`;

export const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Animation helpers - always use these instead of direct keyframe interpolation
export const createAnimation = (
  keyframe: ReturnType<typeof keyframes>, 
  duration: string = '1s', 
  timing: string = 'ease',
  iteration: string = '1'
) => css`
  animation: ${keyframe} ${duration} ${timing} ${iteration};
`;

export const createPulseAnimation = (duration: string = '2s') => 
  createAnimation(pulse, duration, 'ease-in-out', 'infinite');

export const createSpinAnimation = (duration: string = '1s') => 
  createAnimation(spin, duration, 'linear', 'infinite');

export const createFadeInAnimation = (duration: string = '0.3s') => 
  createAnimation(fadeIn, duration, 'ease-out');

export const createShimmerAnimation = (duration: string = '1.5s') => 
  createAnimation(shimmer, duration, 'ease-in-out', 'infinite');
