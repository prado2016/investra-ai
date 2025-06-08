import { useNotifications } from './useNotifications';

/**
 * Convenience hook for displaying notifications
 * Provides simple methods for common notification patterns
 */
export const useNotify = () => {
  const { success, error, warning, info, addNotification } = useNotifications();

  return {
    // Basic notification methods
    success,
    error, 
    warning,
    info,
    
    // Custom notification
    notify: addNotification,
    
    // Common patterns
    apiSuccess: (message: string = 'Operation completed successfully') => {
      return success('Success', message, { duration: 4000 });
    },
    
    apiError: (err: unknown, fallbackMessage: string = 'An error occurred') => {
      const message = (err as Error)?.message || String(err) || fallbackMessage;
      return error('Error', message, { duration: 8000 });
    },
    
    formSaved: (itemName: string = 'Item') => {
      return success('Saved', `${itemName} has been saved successfully`, { duration: 4000 });
    },
    
    formError: (message: string = 'Please check your input and try again') => {
      return error('Validation Error', message, { duration: 6000 });
    },
    
    networkError: () => {
      return error(
        'Network Error', 
        'Please check your internet connection and try again',
        { 
          duration: 0, // Persistent
          action: {
            label: 'Retry',
            onClick: () => window.location.reload()
          }
        }
      );
    },
    
    featureNotAvailable: (featureName: string = 'This feature') => {
      return info(
        'Coming Soon', 
        `${featureName} is not available yet. Stay tuned for updates!`,
        { duration: 5000 }
      );
    },
    
    confirmAction: (
      message: string,
      actionLabel: string,
      onConfirm: () => void
    ) => {
      return warning(
        'Confirm Action',
        message,
        {
          duration: 0, // Persistent until user acts
          action: {
            label: actionLabel,
            onClick: onConfirm
          }
        }
      );
    }
  };
};

export default useNotify;
