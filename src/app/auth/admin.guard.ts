import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';

export const adminGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);

  const user = userService.currentUser();
  if (user?.isAdmin) return true;

  // If user not loaded yet, load it and re-check
  if (user === null) {
    userService.loadCurrentUser();
    // Redirect to home — on next navigation the guard will re-evaluate after load
  }

  router.navigate(['/']);
  return false;
};
