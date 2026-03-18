import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let detail = 'An unexpected error occurred';

      if (error.status === 0) {
        detail = 'Unable to connect to the server';
      } else if (error.status === 401) {
        detail = 'Session expired. Please sign in again.';
      } else if (error.status === 403) {
        detail = 'You do not have permission to perform this action';
      } else if (error.status === 404) {
        detail = 'The requested resource was not found';
      } else if (error.status >= 500) {
        detail = 'A server error occurred. Please try again.';
      } else if (error.error?.message) {
        detail = Array.isArray(error.error.message)
          ? error.error.message.join(', ')
          : error.error.message;
      }

      messageService.add({
        severity: 'error',
        summary: `Error ${error.status || ''}`.trim(),
        detail,
        life: 5000,
      });

      return throwError(() => error);
    }),
  );
};
