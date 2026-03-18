import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Label } from '../models/task.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LabelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/labels`;

  private readonly labelsSignal = signal<Label[]>([]);
  readonly labels = this.labelsSignal.asReadonly();

  loadLabels(): void {
    this.http.get<Label[]>(this.baseUrl).subscribe({
      next: (labels) => this.labelsSignal.set(labels),
    });
  }

  createLabel(name: string, color?: string) {
    return this.http.post<Label>(this.baseUrl, { name, color });
  }
}
