import { computed, Injectable, signal } from '@angular/core';
import { Task, TaskStatus } from '../models/task.model';

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    title: 'Design system architecture',
    description: 'Create the high-level architecture document for the new platform.',
    owner: 'Alice Johnson',
    priority: 'high',
    status: 'completed',
    startDate: '2026-02-01',
    dueDate: '2026-02-15',
    currentMilestone: 'Architecture Review',
    nextMilestone: 'Development Sprint 1',
    labels: ['architecture', 'documentation'],
    checklist: [
      { title: 'Draft architecture diagram', completed: true },
      { title: 'Review with team', completed: true },
      { title: 'Finalize document', completed: true },
    ],
  },
  {
    id: '2',
    title: 'Set up CI/CD pipeline',
    description: 'Configure GitHub Actions for automated build, test, and deployment.',
    owner: 'Bob Smith',
    priority: 'high',
    status: 'in-progress',
    startDate: '2026-02-10',
    dueDate: '2026-03-01',
    currentMilestone: 'Infrastructure Setup',
    nextMilestone: 'First Deployment',
    labels: ['devops', 'infrastructure'],
    checklist: [
      { title: 'Create build workflow', completed: true },
      { title: 'Add test stage', completed: true },
      { title: 'Configure deployment', completed: false },
      { title: 'Add notifications', completed: false },
    ],
  },
  {
    id: '3',
    title: 'Implement user authentication',
    description: 'Add SSO integration with Azure AD for user login.',
    owner: 'Carol Davis',
    priority: 'urgent',
    status: 'in-progress',
    startDate: '2026-02-20',
    dueDate: '2026-03-10',
    currentMilestone: 'Development Sprint 1',
    nextMilestone: 'Security Audit',
    delayRisk: 'Waiting on Azure AD tenant config from IT',
    labels: ['security', 'authentication'],
    checklist: [
      { title: 'Set up Azure AD app registration', completed: true },
      { title: 'Implement login flow', completed: false },
      { title: 'Add token refresh', completed: false },
      { title: 'Write integration tests', completed: false },
    ],
  },
  {
    id: '4',
    title: 'Design dashboard UI',
    description: 'Create mockups and implement the main dashboard view.',
    owner: 'Diana Lee',
    priority: 'medium',
    status: 'not-started',
    startDate: '2026-03-05',
    dueDate: '2026-03-20',
    currentMilestone: 'Development Sprint 1',
    nextMilestone: 'User Testing',
    labels: ['ui', 'design'],
    checklist: [
      { title: 'Create wireframes', completed: false },
      { title: 'Design mockup in Figma', completed: false },
      { title: 'Implement component', completed: false },
    ],
  },
  {
    id: '5',
    title: 'Database migration plan',
    description: 'Plan the migration from legacy SQL Server to PostgreSQL.',
    owner: 'Edward Chen',
    priority: 'high',
    status: 'blocked',
    startDate: '2026-02-25',
    dueDate: '2026-03-15',
    currentMilestone: 'Infrastructure Setup',
    nextMilestone: 'Data Migration',
    delayRisk: 'Legacy schema documentation is incomplete',
    labels: ['database', 'migration'],
    checklist: [
      { title: 'Audit existing schema', completed: true },
      { title: 'Map data types', completed: false },
      { title: 'Write migration scripts', completed: false },
      { title: 'Test on staging', completed: false },
    ],
  },
  {
    id: '6',
    title: 'API endpoint documentation',
    description: 'Document all REST API endpoints using OpenAPI/Swagger.',
    owner: 'Frank Wilson',
    priority: 'low',
    status: 'not-started',
    dueDate: '2026-03-25',
    currentMilestone: 'Development Sprint 2',
    labels: ['documentation', 'api'],
    checklist: [
      { title: 'List all endpoints', completed: false },
      { title: 'Write request/response schemas', completed: false },
      { title: 'Add examples', completed: false },
    ],
  },
  {
    id: '7',
    title: 'Performance benchmarking',
    description: 'Run load tests and establish performance baselines.',
    owner: 'Grace Kim',
    priority: 'medium',
    status: 'not-started',
    startDate: '2026-03-10',
    dueDate: '2026-03-30',
    currentMilestone: 'Development Sprint 2',
    nextMilestone: 'Performance Optimization',
    labels: ['performance', 'testing'],
  },
  {
    id: '8',
    title: 'Teams integration research',
    description: 'Investigate embedding the task board as a Microsoft Teams tab.',
    owner: 'Bob Smith',
    priority: 'medium',
    status: 'in-progress',
    startDate: '2026-03-01',
    dueDate: '2026-03-12',
    currentMilestone: 'Research Phase',
    nextMilestone: 'Prototype',
    labels: ['teams', 'integration'],
    checklist: [
      { title: 'Review Teams SDK docs', completed: true },
      { title: 'Create test manifest', completed: false },
      { title: 'Test tab embedding', completed: false },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly tasksSignal = signal<Task[]>(MOCK_TASKS);

  readonly tasks = this.tasksSignal.asReadonly();

  readonly tasksByStatus = computed(() => {
    const tasks = this.tasksSignal();
    const grouped: Record<TaskStatus, Task[]> = {
      'not-started': [],
      'in-progress': [],
      blocked: [],
      completed: [],
    };
    for (const task of tasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  });

  getTask(id: string): Task | undefined {
    return this.tasksSignal().find((t) => t.id === id);
  }

  addTask(task: Omit<Task, 'id'>): void {
    const id = crypto.randomUUID();
    this.tasksSignal.update((tasks) => [...tasks, { ...task, id }]);
  }

  updateTask(updated: Task): void {
    this.tasksSignal.update((tasks) => tasks.map((t) => (t.id === updated.id ? { ...updated } : t)));
  }

  deleteTask(id: string): void {
    this.tasksSignal.update((tasks) => tasks.filter((t) => t.id !== id));
  }

  moveTask(taskId: string, newStatus: TaskStatus): void {
    this.tasksSignal.update((tasks) =>
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );
  }
}
