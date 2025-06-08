import { useEffect } from 'react';

interface PageTitleOptions {
  subtitle?: string;
  prefix?: string;
  suffix?: string;
}

export const usePageTitle = (title: string, options: PageTitleOptions = {}) => {
  useEffect(() => {
    const { subtitle, prefix = 'Investra', suffix } = options;
    
    let fullTitle = prefix;
    
    if (title) {
      fullTitle += ` - ${title}`;
    }
    
    if (subtitle) {
      fullTitle += ` | ${subtitle}`;
    }
    
    if (suffix) {
      fullTitle += ` ${suffix}`;
    }
    
    document.title = fullTitle;
    
    // Cleanup: restore default title when component unmounts
    return () => {
      document.title = 'Investra - Professional Portfolio Analytics';
    };
  }, [title, options]);
};

export default usePageTitle;
