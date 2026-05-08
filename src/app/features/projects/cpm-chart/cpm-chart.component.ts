import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DependencyType, Task } from '../../../models/task.model';

interface GanttTask {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  isCritical: boolean;
  isDependent: boolean;
  status: string;
}

interface DepEdge {
  type: DependencyType;
  lagDays: number;
  fromId: string;
}

const ROW_HEIGHT = 36;
const ROW_GAP = 4;
const LABEL_WIDTH = 220;
const DAY_WIDTH = 40;
const HEADER_HEIGHT = 56;
const PADDING = 16;

@Component({
  selector: 'app-cpm-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  styles: `
    .gantt-container {
      overflow-x: auto;
      overflow-y: auto;
      max-height: 600px;
    }
    .gantt-container::-webkit-scrollbar {
      height: 8px;
      width: 8px;
    }
    .gantt-container::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
  `,
  template: `
    <div class="border-t border-gray-200 dark:border-gray-700">
      <button
        class="flex w-full items-center gap-2 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
        (click)="collapsed.set(!collapsed())"
        [attr.aria-expanded]="!collapsed()"
        aria-controls="cpm-chart-panel"
      >
        <i class="pi" [class]="collapsed() ? 'pi-chevron-right' : 'pi-chevron-down'"></i>
        Gantt Chart
        @if (criticalCount() > 0) {
          <span
            class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300"
          >
            {{ criticalCount() }} critical
          </span>
        }
      </button>

      @if (!collapsed()) {
        <div id="cpm-chart-panel" class="px-6 pb-6">
          @if (ganttData().tasks.length === 0) {
            <p class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No tasks with dates to visualize. Add start and due dates to see the Gantt chart.
            </p>
          } @else {
            <!-- Legend -->
            <div
              class="mb-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400"
            >
              <span class="flex items-center gap-1">
                <span class="inline-block h-3 w-6 rounded bg-red-500"></span>
                Critical Path
              </span>
              <span class="flex items-center gap-1">
                <span class="inline-block h-3 w-6 rounded bg-blue-500"></span>
                Independent
              </span>
              <span class="flex items-center gap-1">
                <span class="inline-block h-3 w-6 rounded bg-sky-400"></span>
                Dependent
              </span>
              <span class="text-gray-400">
                {{ ganttData().tasks.length }} tasks · {{ ganttData().totalDays }} days
              </span>
            </div>

            <div
              class="gantt-container rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <svg
                [attr.width]="svgWidth()"
                [attr.height]="svgHeight()"
                [attr.viewBox]="'0 0 ' + svgWidth() + ' ' + svgHeight()"
                role="img"
                aria-label="Gantt chart showing task timeline"
              >
                <!-- Date header background -->
                <rect
                  [attr.x]="labelWidth"
                  y="0"
                  [attr.width]="svgWidth() - labelWidth"
                  [attr.height]="headerHeight"
                  fill="#f8fafc"
                  class="dark:fill-gray-800"
                />

                <!-- Date columns + grid lines -->
                @for (day of ganttData().days; track day.toISOString(); let i = $index) {
                  <!-- Vertical grid line -->
                  <line
                    [attr.x1]="labelWidth + i * dayWidth"
                    y1="0"
                    [attr.x2]="labelWidth + i * dayWidth"
                    [attr.y2]="svgHeight()"
                    [attr.stroke]="isWeekend(day) ? '#e2e8f0' : '#f1f5f9'"
                    stroke-width="1"
                  />
                  <!-- Weekend shading -->
                  @if (isWeekend(day)) {
                    <rect
                      [attr.x]="labelWidth + i * dayWidth"
                      [attr.y]="headerHeight"
                      [attr.width]="dayWidth"
                      [attr.height]="svgHeight() - headerHeight"
                      fill="#f8fafc"
                      opacity="0.5"
                    />
                  }
                  <!-- Date labels: month + day -->
                  <text
                    [attr.x]="labelWidth + i * dayWidth + dayWidth / 2"
                    y="18"
                    text-anchor="middle"
                    font-size="9"
                    fill="#94a3b8"
                  >
                    {{ day | date: 'MMM' }}
                  </text>
                  <text
                    [attr.x]="labelWidth + i * dayWidth + dayWidth / 2"
                    y="34"
                    text-anchor="middle"
                    font-size="11"
                    font-weight="500"
                    [attr.fill]="isWeekend(day) ? '#cbd5e1' : '#64748b'"
                  >
                    {{ day | date: 'd' }}
                  </text>
                }

                <!-- Header separator -->
                <line
                  [attr.x1]="0"
                  [attr.y1]="headerHeight"
                  [attr.x2]="svgWidth()"
                  [attr.y2]="headerHeight"
                  stroke="#e2e8f0"
                  stroke-width="1"
                />
                <!-- Label / chart separator -->
                <line
                  [attr.x1]="labelWidth"
                  y1="0"
                  [attr.x2]="labelWidth"
                  [attr.y2]="svgHeight()"
                  stroke="#e2e8f0"
                  stroke-width="1"
                />

                <!-- Today marker -->
                @if (todayOffset() >= 0) {
                  <line
                    [attr.x1]="labelWidth + todayOffset() * dayWidth + dayWidth / 2"
                    [attr.y1]="headerHeight"
                    [attr.x2]="labelWidth + todayOffset() * dayWidth + dayWidth / 2"
                    [attr.y2]="svgHeight()"
                    stroke="#f59e0b"
                    stroke-width="2"
                    stroke-dasharray="4,4"
                  />
                }

                <!-- Task rows -->
                @for (task of ganttData().tasks; track task.id; let i = $index) {
                  <!-- Row background (alternating) -->
                  <rect
                    x="0"
                    [attr.y]="headerHeight + i * (rowHeight + rowGap)"
                    [attr.width]="svgWidth()"
                    [attr.height]="rowHeight"
                    [attr.fill]="i % 2 === 0 ? '#ffffff' : '#fafafa'"
                    class="dark:fill-gray-900"
                  />

                  <!-- Row separator -->
                  <line
                    x1="0"
                    [attr.y1]="headerHeight + i * (rowHeight + rowGap) + rowHeight + rowGap / 2"
                    [attr.x2]="svgWidth()"
                    [attr.y2]="headerHeight + i * (rowHeight + rowGap) + rowHeight + rowGap / 2"
                    stroke="#f1f5f9"
                    stroke-width="0.5"
                  />

                  <!-- Task name label -->
                  <text
                    x="12"
                    [attr.y]="headerHeight + i * (rowHeight + rowGap) + rowHeight / 2 + 4"
                    font-size="11"
                    fill="#374151"
                    class="dark:fill-gray-300"
                  >
                    {{ truncate(task.title, 28) }}
                  </text>

                  <!-- Task bar -->
                  <rect
                    [attr.x]="barX(task)"
                    [attr.y]="headerHeight + i * (rowHeight + rowGap) + 6"
                    [attr.width]="barWidth(task)"
                    [attr.height]="rowHeight - 12"
                    [attr.rx]="4"
                    [attr.ry]="4"
                    [attr.fill]="barColor(task)"
                    [attr.opacity]="task.status === 'completed' ? 0.5 : 0.85"
                  />

                  <!-- Duration label on bar -->
                  @if (barWidth(task) > 30) {
                    <text
                      [attr.x]="barX(task) + barWidth(task) / 2"
                      [attr.y]="headerHeight + i * (rowHeight + rowGap) + rowHeight / 2 + 4"
                      text-anchor="middle"
                      font-size="10"
                      font-weight="500"
                      fill="#ffffff"
                    >
                      {{ task.duration }}d
                    </text>
                  }
                }
              </svg>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class CpmChartComponent {
  readonly tasks = input.required<Task[]>();
  readonly collapsed = signal(true);

  readonly labelWidth = LABEL_WIDTH;
  readonly dayWidth = DAY_WIDTH;
  readonly rowHeight = ROW_HEIGHT;
  readonly rowGap = ROW_GAP;
  readonly headerHeight = HEADER_HEIGHT;

  readonly ganttData = computed(() => this.computeGantt(this.tasks()));

  readonly criticalCount = computed(
    () => this.ganttData().tasks.filter((t) => t.isCritical).length,
  );

  readonly svgWidth = computed(() => {
    const data = this.ganttData();
    return LABEL_WIDTH + data.totalDays * DAY_WIDTH + PADDING;
  });

  readonly svgHeight = computed(() => {
    const data = this.ganttData();
    return HEADER_HEIGHT + data.tasks.length * (ROW_HEIGHT + ROW_GAP) + PADDING;
  });

  readonly todayOffset = computed(() => {
    const data = this.ganttData();
    if (!data.startDate) return -1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff < data.totalDays ? diff : -1;
  });

  truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max - 1) + '…' : text;
  }

  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  barX(task: GanttTask): number {
    const data = this.ganttData();
    if (!data.startDate) return LABEL_WIDTH;
    const daysDiff = Math.floor(
      (task.startDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return LABEL_WIDTH + daysDiff * DAY_WIDTH;
  }

  barWidth(task: GanttTask): number {
    return Math.max(task.duration * DAY_WIDTH, DAY_WIDTH);
  }

  barColor(task: GanttTask): string {
    if (task.isCritical) return '#ef4444'; // red
    if (task.isDependent) return '#38bdf8'; // sky
    return '#3b82f6'; // blue
  }

  private computeGantt(tasks: Task[]): {
    tasks: GanttTask[];
    days: Date[];
    totalDays: number;
    startDate: Date | null;
  } {
    // Filter to tasks that have at least a startDate or dueDate
    const datedTasks = tasks.filter((t) => t.startDate || t.dueDate);
    if (!datedTasks.length) {
      return { tasks: [], days: [], totalDays: 0, startDate: null };
    }

    // Build dependency maps for CPM (with typed edges)
    const participatingIds = new Set<string>();
    const predecessorEdges = new Map<string, DepEdge[]>();
    const successors = new Map<string, string[]>();

    for (const t of datedTasks) {
      predecessorEdges.set(t.id, []);
      successors.set(t.id, []);
    }

    const taskIds = new Set(datedTasks.map((t) => t.id));

    for (const t of datedTasks) {
      if (!t.dependencies) continue;
      for (const dep of t.dependencies) {
        if (taskIds.has(dep.dependsOnTaskId)) {
          participatingIds.add(t.id);
          participatingIds.add(dep.dependsOnTaskId);
          predecessorEdges.get(t.id)?.push({
            type: dep.type,
            lagDays: dep.lagDays ?? 0,
            fromId: dep.dependsOnTaskId,
          });
          successors.get(dep.dependsOnTaskId)?.push(t.id);
        }
      }
    }

    // CPM forward/backward pass for critical path identification
    const durationOf = (t: Task): number => {
      if (t.startDate && t.dueDate) {
        const start = new Date(t.startDate).getTime();
        const end = new Date(t.dueDate).getTime();
        return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      }
      return 1;
    };

    const taskMap = new Map(datedTasks.map((t) => [t.id, t]));

    // Topological sort for CPM
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (visited.has(id) || !taskIds.has(id)) return;
      visited.add(id);
      for (const edge of predecessorEdges.get(id) ?? []) {
        visit(edge.fromId);
      }
      sorted.push(id);
    };
    for (const t of datedTasks) visit(t.id);

    // Forward pass — computes early start (ES) and early finish (EF) per dependency type:
    // finish-to-start: ES(successor) >= EF(predecessor)
    // finish-to-finish: EF(successor) >= EF(predecessor) + lag → ES = EF(pred) + lag - dur
    // start-to-start: ES(successor) >= ES(predecessor) + lag
    // corequisite: ES(successor) >= ES(predecessor) (same as start-to-start with 0 lag)
    const esMap = new Map<string, number>();
    const efMap = new Map<string, number>();
    for (const id of sorted) {
      const task = taskMap.get(id)!;
      const dur = durationOf(task);
      const edges = predecessorEdges.get(id) ?? [];
      let es = 0;
      for (const edge of edges) {
        const predEs = esMap.get(edge.fromId) ?? 0;
        const predEf = efMap.get(edge.fromId) ?? 0;
        let constraint = 0;
        switch (edge.type) {
          case 'finish-to-start':
            constraint = predEf;
            break;
          case 'finish-to-finish':
            // EF(this) >= EF(pred) + lag → ES(this) >= EF(pred) + lag - dur
            constraint = predEf + edge.lagDays - dur;
            break;
          case 'start-to-start':
            constraint = predEs + edge.lagDays;
            break;
          case 'corequisite':
            constraint = predEs;
            break;
        }
        es = Math.max(es, constraint);
      }
      esMap.set(id, es);
      efMap.set(id, es + dur);
    }

    const projectEnd = Math.max(...[...efMap.values()], 0);

    // Backward pass — computes late finish (LF) and late start (LS)
    // For each successor of a task, the constraint on the predecessor's LF depends on the type:
    // finish-to-start: LF(pred) <= LS(successor)
    // finish-to-finish: LF(pred) <= LF(successor) - lag
    // start-to-start: LS(pred) <= LS(successor) - lag → LF(pred) <= LS(succ) - lag + dur(pred)
    // corequisite: LS(pred) <= LS(successor) → LF(pred) <= LS(succ) + dur(pred)
    const lsMap = new Map<string, number>();
    const lfMap = new Map<string, number>();
    for (let i = sorted.length - 1; i >= 0; i--) {
      const id = sorted[i];
      const task = taskMap.get(id)!;
      const dur = durationOf(task);
      const succs = successors.get(id) ?? [];
      let lf = projectEnd;
      for (const succId of succs) {
        const succTask = taskMap.get(succId)!;
        const succDur = durationOf(succTask);
        const succLs = lsMap.get(succId) ?? projectEnd - succDur;
        const succLf = lfMap.get(succId) ?? projectEnd;
        // Find the edge from this predecessor to the successor
        const edge = (predecessorEdges.get(succId) ?? []).find((e) => e.fromId === id);
        if (!edge) {
          lf = Math.min(lf, succLs);
          continue;
        }
        let constraint = projectEnd;
        switch (edge.type) {
          case 'finish-to-start':
            constraint = succLs;
            break;
          case 'finish-to-finish':
            constraint = succLf - edge.lagDays;
            break;
          case 'start-to-start':
            constraint = succLs - edge.lagDays + dur;
            break;
          case 'corequisite':
            constraint = succLs + dur;
            break;
        }
        lf = Math.min(lf, constraint);
      }
      lfMap.set(id, lf);
      lsMap.set(id, lf - dur);
    }

    const criticalIds = new Set<string>();
    for (const id of sorted) {
      const slack = (lsMap.get(id) ?? 0) - (esMap.get(id) ?? 0);
      if (slack === 0 && participatingIds.has(id)) {
        criticalIds.add(id);
      }
    }

    // Determine the overall date range
    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);

    for (const t of datedTasks) {
      const start = t.startDate ? new Date(t.startDate) : t.dueDate ? new Date(t.dueDate) : null;
      const end = t.dueDate ? new Date(t.dueDate) : t.startDate ? new Date(t.startDate) : null;
      if (start && start < minDate) minDate = start;
      if (end && end > maxDate) maxDate = end;
    }

    minDate.setHours(0, 0, 0, 0);
    maxDate.setHours(0, 0, 0, 0);

    // Add 1-day padding on each side
    const chartStart = new Date(minDate);
    chartStart.setDate(chartStart.getDate() - 1);
    const chartEnd = new Date(maxDate);
    chartEnd.setDate(chartEnd.getDate() + 2);

    const totalDays =
      Math.ceil((chartEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Generate day columns
    const days: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(chartStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    // Build gantt tasks sorted by start date
    const ganttTasks: GanttTask[] = datedTasks
      .map((t) => {
        const start = t.startDate ? new Date(t.startDate) : new Date(t.dueDate!);
        const end = t.dueDate ? new Date(t.dueDate) : new Date(t.startDate!);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const duration = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
        );

        return {
          id: t.id,
          title: t.title,
          startDate: start,
          endDate: end,
          duration,
          isCritical: criticalIds.has(t.id),
          isDependent: (t.dependencies?.length ?? 0) > 0,
          status: t.status,
        };
      })
      .sort((a, b) => {
        // Critical tasks first, then by start date
        if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1;
        return a.startDate.getTime() - b.startDate.getTime();
      });

    return { tasks: ganttTasks, days, totalDays, startDate: chartStart };
  }
}
