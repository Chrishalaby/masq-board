import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { User } from '../models/user.model';
import { UserService } from '../services/user.service';

function hasAttendanceAccess(user: User): boolean {
  return user.canUseAttendance || user.canViewAttendanceReports;
}

export const attendanceGuard: CanActivateFn = () => {
  const userService = inject(UserService);
  const router = inject(Router);
  const home = router.createUrlTree(['/']);

  const user = userService.currentUser();
  if (user) {
    return hasAttendanceAccess(user) || home;
  }

  return toObservable(userService.currentUser).pipe(
    filter((loaded) => loaded !== null),
    map((loaded) => hasAttendanceAccess(loaded) || home),
  );
};
