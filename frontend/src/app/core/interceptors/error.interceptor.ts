import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErrorNotificationService } from '../services/error-notification.service';

/**
 * HTTP Error Interceptor
 *
 * Provides centralized error handling for all HTTP requests:
 * - User-friendly error notifications
 * - Consistent error categorization
 * - Logging for debugging
 *
 * NOTE: Retry logic is handled by RequestCoordinatorService
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private errorNotification: ErrorNotificationService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Log the error for debugging
        console.error('HTTP Error:', {
          url: request.url,
          method: request.method,
          status: error.status,
          message: error.message,
          error: error.error,
        });

        // Show user-friendly notification only once (not on retries)
        // Mark error as already shown to prevent duplicate notifications
        if (!(error as any)._notificationShown) {
          this.errorNotification.handleHttpError(error);
          (error as any)._notificationShown = true;
        }

        // Re-throw the error for RequestCoordinator to handle retries
        return throwError(() => error);
      })
    );
  }
}
