import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

function withToken<T>(req: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

export const appApiAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);

  return from(auth.getApiAccessToken()).pipe(
    switchMap((token) =>
      next(withToken(req, token)).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status !== 401 || !auth.inTeamsContext()) {
            return throwError(() => error);
          }
          return from(auth.refreshApiAccessToken()).pipe(
            switchMap((freshToken) =>
              freshToken && freshToken !== token
                ? next(withToken(req, freshToken))
                : throwError(() => error),
            ),
          );
        }),
      ),
    ),
  );
};
