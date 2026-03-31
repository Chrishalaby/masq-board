import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { UserService } from '../services/user.service';

export const adminGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  const user = userService.currentUser();
  if (user) {
    console.log('[adminGuard] currentUser:', user.email, 'isAdmin:', user.isAdmin);
    return user.isAdmin || router.createUrlTree(['/']);
  }

  console.log('[adminGuard] waiting for currentUser signal…');
  return toObservable(userService.currentUser).pipe(
    filter((u) => u !== null),
    map((u) => {
      console.log('[adminGuard] currentUser:', u.email, 'isAdmin:', u.isAdmin);
      return u.isAdmin || router.createUrlTree(['/']);
    }),
  );
};
