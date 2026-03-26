import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { Task } from '../../../models/task.model';

interface CpmNode {
  id: string;
  title: string;
  duration: number;
  es: number; // earliest start
  ef: number; // earliest finish
  ls: number; // latest start
  lf: number; // latest finish
  slack: number;
  isCritical: boolean;
  dependencies: string[];
  x: number;
  y: number;
  column: number;
  row: number;
}

interface CpmEdge {
  from: CpmNode;
  to: CpmNode;
  isCritical: boolean;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const COL_GAP = 80;
const ROW_GAP = 32;
const PADDING = 40;

@Component({
  selector: 'app-cpm-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  styles: `
    .cpm-container {
      overflow-x: auto;
      overflow-y: auto;
      max-height: 500px;
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
        Critical Path Chart
        @if (criticalPathLength() > 0) {
          <span
            class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900 dark:text-red-300"
          >
            {{ criticalPathLength() }} critical tasks
          </span>
        }
      </button>

      @if (!collapsed()) {
        <div id="cpm-chart-panel" class="px-6 pb-6">
          @if (cpmData().nodes.length === 0) {
            <p class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No tasks with dependencies to visualize. Add task dependencies to see the critical
              path.
            </p>
          } @else {
            <div class="mb-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1">
                <span
                  class="inline-block h-3 w-3 rounded border-2 border-red-500 bg-red-50 dark:bg-red-950"
                ></span>
                Critical Path
              </span>
              <span class="flex items-center gap-1">
                <span
                  class="inline-block h-3 w-3 rounded border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
                ></span>
                Non-Critical
              </span>
              <span>Total project duration: {{ projectDuration() }} day(s)</span>
            </div>
            <div
              class="cpm-container rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            >
              <svg
                [attr.width]="svgWidth()"
                [attr.height]="svgHeight()"
                [attr.viewBox]="'0 0 ' + svgWidth() + ' ' + svgHeight()"
                role="img"
                aria-label="Critical Path Method chart showing task dependencies"
              >
                <defs>
                  <marker
                    id="arrow-critical"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L8,3 L0,6 Z" fill="#ef4444" />
                  </marker>
                  <marker
                    id="arrow-normal"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L8,3 L0,6 Z" fill="#9ca3af" />
                  </marker>
                </defs>

                <!-- Edges -->
                @for (edge of cpmData().edges; track edge.from.id + edge.to.id) {
                  <path
                    [attr.d]="edgePath(edge)"
                    [attr.stroke]="edge.isCritical ? '#ef4444' : '#d1d5db'"
                    [attr.stroke-width]="edge.isCritical ? 2.5 : 1.5"
                    fill="none"
                    [attr.marker-end]="
                      edge.isCritical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'
                    "
                    [attr.stroke-dasharray]="edge.isCritical ? 'none' : '6,3'"
                  />
                }

                <!-- Nodes -->
                @for (node of cpmData().nodes; track node.id) {
                  <g [attr.transform]="'translate(' + node.x + ',' + node.y + ')'">
                    <rect
                      [attr.width]="nodeWidth"
                      [attr.height]="nodeHeight"
                      rx="8"
                      ry="8"
                      [attr.fill]="node.isCritical ? '#fef2f2' : '#ffffff'"
                      [attr.stroke]="node.isCritical ? '#ef4444' : '#d1d5db'"
                      [attr.stroke-width]="node.isCritical ? 2 : 1"
                      class="dark-node"
                    />
                    <!-- Title -->
                    <text
                      [attr.x]="nodeWidth / 2"
                      y="20"
                      text-anchor="middle"
                      font-size="11"
                      font-weight="600"
                      fill="#1f2937"
                    >
                      {{ truncate(node.title, 24) }}
                    </text>
                    <!-- ES / EF -->
                    <text [attr.x]="8" y="42" font-size="9" fill="#6b7280">
                      ES:{{ node.es }} EF:{{ node.ef }}
                    </text>
                    <!-- LS / LF -->
                    <text [attr.x]="8" y="56" font-size="9" fill="#6b7280">
                      LS:{{ node.ls }} LF:{{ node.lf }}
                    </text>
                    <!-- Slack -->
                    <text
                      [attr.x]="nodeWidth - 8"
                      y="49"
                      text-anchor="end"
                      font-size="10"
                      [attr.fill]="node.slack === 0 ? '#ef4444' : '#6b7280'"
                      font-weight="500"
                    >
                      Slack: {{ node.slack }}
                    </text>
                  </g>
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

  readonly nodeWidth = NODE_WIDTH;
  readonly nodeHeight = NODE_HEIGHT;

  readonly cpmData = computed(() => this.computeCpm(this.tasks()));

  readonly criticalPathLength = computed(
    () => this.cpmData().nodes.filter((n) => n.isCritical).length,
  );

  readonly projectDuration = computed(() => {
    const nodes = this.cpmData().nodes;
    return nodes.length ? Math.max(...nodes.map((n) => n.ef)) : 0;
  });

  readonly svgWidth = computed(() => {
    const nodes = this.cpmData().nodes;
    if (!nodes.length) return 0;
    const maxCol = Math.max(...nodes.map((n) => n.column));
    return (maxCol + 1) * (NODE_WIDTH + COL_GAP) + PADDING * 2;
  });

  readonly svgHeight = computed(() => {
    const nodes = this.cpmData().nodes;
    if (!nodes.length) return 0;
    const maxRow = Math.max(...nodes.map((n) => n.row));
    return (maxRow + 1) * (NODE_HEIGHT + ROW_GAP) + PADDING * 2;
  });

  truncate(text: string, max: number): string {
    return text.length > max ? text.substring(0, max - 1) + '…' : text;
  }

  edgePath(edge: CpmEdge): string {
    const fromX = edge.from.x + NODE_WIDTH;
    const fromY = edge.from.y + NODE_HEIGHT / 2;
    const toX = edge.to.x;
    const toY = edge.to.y + NODE_HEIGHT / 2;

    if (edge.to.column > edge.from.column) {
      // Forward edge: simple bezier
      const cpX = (fromX + toX) / 2;
      return `M${fromX},${fromY} C${cpX},${fromY} ${cpX},${toY} ${toX},${toY}`;
    }
    // Backward/same column: route around
    const offset = 20;
    const midY = Math.min(fromY, toY) - NODE_HEIGHT - offset;
    return `M${fromX},${fromY} L${fromX + offset},${fromY} L${fromX + offset},${midY} L${toX - offset},${midY} L${toX - offset},${toY} L${toX},${toY}`;
  }

  private computeCpm(tasks: Task[]): { nodes: CpmNode[]; edges: CpmEdge[] } {
    // Only include tasks that participate in dependencies
    const taskMap = new Map<string, Task>();
    const participatingIds = new Set<string>();

    for (const task of tasks) {
      taskMap.set(task.id, task);
      if (task.dependencies?.length) {
        participatingIds.add(task.id);
        for (const dep of task.dependencies) {
          participatingIds.add(dep.dependsOnTaskId);
        }
      }
    }

    // If no dependencies exist, show all tasks in a simple layout
    const relevantTasks =
      participatingIds.size > 0 ? tasks.filter((t) => participatingIds.has(t.id)) : [];

    if (!relevantTasks.length) {
      return { nodes: [], edges: [] };
    }

    // Build adjacency (predecessors for each task)
    const predecessors = new Map<string, string[]>();
    const successors = new Map<string, string[]>();

    for (const t of relevantTasks) {
      predecessors.set(t.id, []);
      successors.set(t.id, []);
    }

    for (const t of relevantTasks) {
      if (!t.dependencies) continue;
      for (const dep of t.dependencies) {
        if (taskMap.has(dep.dependsOnTaskId)) {
          predecessors.get(t.id)?.push(dep.dependsOnTaskId);
          successors.get(dep.dependsOnTaskId)?.push(t.id);
        }
      }
    }

    // Compute durations — use days between start and due, fallback to 1
    const durationOf = (t: Task): number => {
      if (t.startDate && t.dueDate) {
        const start = new Date(t.startDate).getTime();
        const end = new Date(t.dueDate).getTime();
        const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
        return days;
      }
      return 1;
    };

    // Create nodes
    const nodeMap = new Map<string, CpmNode>();
    for (const t of relevantTasks) {
      nodeMap.set(t.id, {
        id: t.id,
        title: t.title,
        duration: durationOf(t),
        es: 0,
        ef: 0,
        ls: 0,
        lf: 0,
        slack: 0,
        isCritical: false,
        dependencies: predecessors.get(t.id) ?? [],
        x: 0,
        y: 0,
        column: 0,
        row: 0,
      });
    }

    // Topological sort
    const sorted = this.topologicalSort(relevantTasks, predecessors);

    // Forward pass: compute ES and EF
    for (const id of sorted) {
      const node = nodeMap.get(id)!;
      const preds = predecessors.get(id) ?? [];
      node.es = preds.length ? Math.max(...preds.map((p) => nodeMap.get(p)?.ef ?? 0)) : 0;
      node.ef = node.es + node.duration;
    }

    // Project completion time
    const projectEnd = Math.max(...[...nodeMap.values()].map((n) => n.ef));

    // Backward pass: compute LF and LS
    for (let i = sorted.length - 1; i >= 0; i--) {
      const node = nodeMap.get(sorted[i])!;
      const succs = successors.get(sorted[i]) ?? [];
      node.lf = succs.length
        ? Math.min(...succs.map((s) => nodeMap.get(s)?.ls ?? projectEnd))
        : projectEnd;
      node.ls = node.lf - node.duration;
      node.slack = node.ls - node.es;
      node.isCritical = node.slack === 0;
    }

    // Assign column by topological level, row by index within level
    const levels = new Map<number, string[]>();
    const nodeLevel = new Map<string, number>();

    for (const id of sorted) {
      const preds = predecessors.get(id) ?? [];
      const level = preds.length ? Math.max(...preds.map((p) => (nodeLevel.get(p) ?? 0) + 1)) : 0;
      nodeLevel.set(id, level);
      if (!levels.has(level)) levels.set(level, []);
      levels.get(level)!.push(id);
    }

    for (const [level, ids] of levels) {
      ids.forEach((id, rowIdx) => {
        const node = nodeMap.get(id)!;
        node.column = level;
        node.row = rowIdx;
        node.x = PADDING + level * (NODE_WIDTH + COL_GAP);
        node.y = PADDING + rowIdx * (NODE_HEIGHT + ROW_GAP);
      });
    }

    // Build edges
    const edges: CpmEdge[] = [];
    for (const t of relevantTasks) {
      if (!t.dependencies) continue;
      for (const dep of t.dependencies) {
        const from = nodeMap.get(dep.dependsOnTaskId);
        const to = nodeMap.get(t.id);
        if (from && to) {
          edges.push({
            from,
            to,
            isCritical: from.isCritical && to.isCritical,
          });
        }
      }
    }

    return { nodes: [...nodeMap.values()], edges };
  }

  private topologicalSort(tasks: Task[], predecessors: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const result: string[] = [];
    const taskIds = new Set(tasks.map((t) => t.id));

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      for (const pred of predecessors.get(id) ?? []) {
        if (taskIds.has(pred)) visit(pred);
      }
      result.push(id);
    };

    for (const t of tasks) {
      visit(t.id);
    }

    return result;
  }
}
