import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SILENT_HTTP_ERRORS } from '../interceptors/error.interceptor';

interface UserPreferenceResponse {
  readonly key: string;
  readonly value: unknown;
}

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users/me/preferences`;

  get(key: string): Observable<unknown> {
    return this.http
      .get<UserPreferenceResponse>(this.url(key), { context: this.silentErrors() })
      .pipe(map((response) => response.value));
  }

  set(key: string, value: unknown): Observable<unknown> {
    return this.http
      .put<UserPreferenceResponse>(this.url(key), { value }, { context: this.silentErrors() })
      .pipe(map((response) => response.value));
  }

  private url(key: string): string {
    return `${this.baseUrl}/${encodeURIComponent(key)}`;
  }

  private silentErrors(): HttpContext {
    return new HttpContext().set(SILENT_HTTP_ERRORS, true);
  }
}
