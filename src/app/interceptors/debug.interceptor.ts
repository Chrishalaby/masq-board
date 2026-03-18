import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs/operators';

export const debugInterceptor: HttpInterceptorFn = (req, next) => {
  console.info('[HttpDebug] request:start', {
    method: req.method,
    url: req.url,
    withCredentials: req.withCredentials,
    hasAuthorization: req.headers.has('Authorization'),
    body: req.body,
  });

  return next(req).pipe(
    tap({
      next: (event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          console.info('[HttpDebug] request:success', {
            method: req.method,
            url: req.url,
            status: event.status,
            body: event.body,
          });
        }
      },
      error: (error) => {
        console.error('[HttpDebug] request:error', {
          method: req.method,
          url: req.url,
          error,
        });
      },
    }),
  );
};
