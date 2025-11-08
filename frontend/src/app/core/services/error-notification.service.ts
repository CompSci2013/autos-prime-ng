import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warn',  // PrimeNG uses 'warn' not 'warning'
  ERROR = 'error',
  SUCCESS = 'success',
}

export interface ErrorCategory {
  title: string;
  message: string;
  severity: ErrorSeverity;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ErrorNotificationService {
  // Track recent errors to prevent duplicate notifications
  private recentErrors = new Map<string, number>();
  private readonly DEDUPE_WINDOW = 3000; // 3 seconds

  constructor(private messageService: MessageService) {}

  /**
   * Show a user-friendly error notification
   */
  showError(title: string, message: string, duration: number = 5000): void {
    this.messageService.add({
      severity: 'error',
      summary: title,
      detail: message,
      life: duration,
    });
  }

  /**
   * Show a warning notification
   */
  showWarning(title: string, message: string, duration: number = 4000): void {
    this.messageService.add({
      severity: 'warn',
      summary: title,
      detail: message,
      life: duration,
    });
  }

  /**
   * Show an info notification
   */
  showInfo(title: string, message: string, duration: number = 3000): void {
    this.messageService.add({
      severity: 'info',
      summary: title,
      detail: message,
      life: duration,
    });
  }

  /**
   * Show a success notification
   */
  showSuccess(title: string, message: string, duration: number = 3000): void {
    this.messageService.add({
      severity: 'success',
      summary: title,
      detail: message,
      life: duration,
    });
  }

  /**
   * Categorize HTTP error and show appropriate notification
   * Deduplicates notifications within a short time window
   */
  handleHttpError(error: any): void {
    // Create a key for deduplication based on status and URL
    const url = error.url || error.message || 'unknown';
    const errorKey = `${error.status}-${url}`;
    const now = Date.now();

    // Debug logging to see what's happening
    console.log('[ErrorNotification] Checking error:', {
      errorKey,
      url,
      status: error.status,
      hasBeenShown: this.recentErrors.has(errorKey),
    });

    // Check if we've recently shown this error
    const lastShown = this.recentErrors.get(errorKey);
    if (lastShown && now - lastShown < this.DEDUPE_WINDOW) {
      console.log(`[ErrorNotification] Suppressing duplicate for: ${errorKey} (shown ${now - lastShown}ms ago)`);
      return;
    }

    // Mark this error as shown
    this.recentErrors.set(errorKey, now);
    console.log(`[ErrorNotification] Showing notification for: ${errorKey}`);

    // Clean up old entries
    this.cleanupRecentErrors(now);

    const category = this.categorizeError(error);

    switch (category.severity) {
      case ErrorSeverity.ERROR:
        this.showError(category.title, category.message, category.duration);
        break;
      case ErrorSeverity.WARNING:
        this.showWarning(category.title, category.message, category.duration);
        break;
      case ErrorSeverity.INFO:
        this.showInfo(category.title, category.message, category.duration);
        break;
      default:
        this.showError(category.title, category.message, category.duration);
    }
  }

  /**
   * Clean up old error entries to prevent memory leaks
   */
  private cleanupRecentErrors(now: number): void {
    const keysToDelete: string[] = [];
    this.recentErrors.forEach((timestamp, key) => {
      if (now - timestamp > this.DEDUPE_WINDOW * 2) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.recentErrors.delete(key));
  }

  /**
   * Categorize error based on status code and type
   */
  private categorizeError(error: any): ErrorCategory {
    // Network errors (no response from server)
    if (!error.status || error.status === 0) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        severity: ErrorSeverity.ERROR,
        duration: 6000,
      };
    }

    // Client errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      switch (error.status) {
        case 400:
          return {
            title: 'Invalid Request',
            message: error.error?.message || 'The request contains invalid data. Please check your input.',
            severity: ErrorSeverity.WARNING,
            duration: 5000,
          };
        case 401:
          return {
            title: 'Authentication Required',
            message: 'Please log in to continue.',
            severity: ErrorSeverity.WARNING,
            duration: 5000,
          };
        case 403:
          return {
            title: 'Access Denied',
            message: 'You do not have permission to perform this action.',
            severity: ErrorSeverity.ERROR,
            duration: 5000,
          };
        case 404:
          return {
            title: 'Not Found',
            message: error.error?.message || 'The requested resource was not found.',
            severity: ErrorSeverity.WARNING,
            duration: 4000,
          };
        case 429:
          return {
            title: 'Too Many Requests',
            message: 'You are making requests too quickly. Please slow down.',
            severity: ErrorSeverity.WARNING,
            duration: 6000,
          };
        default:
          return {
            title: 'Request Error',
            message: error.error?.message || 'An error occurred while processing your request.',
            severity: ErrorSeverity.WARNING,
            duration: 5000,
          };
      }
    }

    // Server errors (5xx)
    if (error.status >= 500) {
      return {
        title: 'Server Error',
        message: 'The server encountered an error. Please try again later.',
        severity: ErrorSeverity.ERROR,
        duration: 6000,
      };
    }

    // Unknown errors
    return {
      title: 'Unexpected Error',
      message: 'An unexpected error occurred. Please try again.',
      severity: ErrorSeverity.ERROR,
      duration: 5000,
    };
  }
}
