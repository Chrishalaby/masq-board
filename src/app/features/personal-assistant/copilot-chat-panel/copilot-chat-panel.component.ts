import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Textarea } from 'primeng/textarea';
import { CopilotConversation } from '../../../models/copilot-chat.model';
import { CopilotChatService } from '../../../services/copilot-chat.service';

@Component({
  selector: 'app-copilot-chat-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, Button, Textarea],
  template: `
    <!-- Backdrop -->
    @if (visible()) {
      <div
        class="fixed inset-0 z-40 bg-black/30 transition-opacity"
        (click)="close()"
        role="presentation"
      ></div>
    }

    <!-- Panel -->
    <aside
      class="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 dark:border-gray-700 dark:bg-gray-900 sm:w-[440px]"
      [class.translate-x-0]="visible()"
      [class.translate-x-full]="!visible()"
      role="complementary"
      aria-label="Copilot Chat"
    >
      <!-- Header -->
      <header
        class="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700"
      >
        <div class="flex items-center gap-2">
          <i class="pi pi-sparkles text-lg text-purple-400"></i>
          <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Copilot Chat</h2>
        </div>
        <div class="flex items-center gap-1">
          <p-button
            icon="pi pi-plus"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            size="small"
            (onClick)="startNewConversation()"
            aria-label="New conversation"
          />
          <p-button
            [icon]="showHistory() ? 'pi pi-comments' : 'pi pi-history'"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            size="small"
            (onClick)="showHistory.set(!showHistory())"
            [attr.aria-label]="showHistory() ? 'Show chat' : 'Show history'"
          />
          <p-button
            icon="pi pi-times"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            size="small"
            (onClick)="close()"
            aria-label="Close Copilot Chat"
          />
        </div>
      </header>

      <!-- History view -->
      @if (showHistory()) {
        <div class="flex-1 overflow-y-auto">
          @if (conversations().length === 0) {
            <div
              class="flex flex-col items-center justify-center gap-3 p-8 text-center text-gray-400 dark:text-gray-500"
            >
              <i class="pi pi-comments text-4xl"></i>
              <p class="text-sm">No conversations yet</p>
              <p-button
                label="Start a chat"
                icon="pi pi-plus"
                severity="secondary"
                [outlined]="true"
                size="small"
                (onClick)="startNewConversation()"
              />
            </div>
          } @else {
            <ul class="divide-y divide-gray-100 dark:divide-gray-800" role="list">
              @for (conv of conversations(); track conv.id) {
                <li
                  class="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                  [class.bg-purple-50]="activeConversation()?.id === conv.id"
                  [class.dark:bg-purple-900/20]="activeConversation()?.id === conv.id"
                  (click)="openConversation(conv)"
                  (keydown.enter)="openConversation(conv)"
                  tabindex="0"
                  role="listitem"
                >
                  <i class="pi pi-comment text-gray-400 dark:text-gray-500"></i>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {{ conv.title || 'New conversation' }}
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">
                      {{ conv.updatedAt | date: 'MMM d, y h:mm a' }}
                    </p>
                  </div>
                  <p-button
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    severity="danger"
                    size="small"
                    class="opacity-0 transition-opacity group-hover:opacity-100"
                    (onClick)="deleteConversation(conv, $event)"
                    aria-label="Delete conversation"
                  />
                </li>
              }
            </ul>
          }
        </div>
      } @else {
        <!-- Chat view -->
        @if (!activeConversation()) {
          <!-- Welcome / empty state -->
          <div class="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40"
            >
              <i class="pi pi-sparkles text-3xl text-purple-500"></i>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Microsoft 365 Copilot
            </h3>
            <p class="max-w-xs text-sm text-gray-500 dark:text-gray-400">
              Ask about your tasks, projects, and notes. Copilot has context about your work and can
              help you stay organized.
            </p>
            <p-button
              label="Start a conversation"
              icon="pi pi-plus"
              severity="secondary"
              [outlined]="true"
              (onClick)="startNewConversation()"
            />
          </div>
        } @else {
          <!-- Message thread -->
          <div
            #messageContainer
            class="flex-1 space-y-4 overflow-y-auto p-4"
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
          >
            @for (msg of activeConversation()?.messages || []; track msg.id) {
              <div
                class="flex"
                [class.justify-end]="msg.role === 'user'"
                [class.justify-start]="msg.role === 'assistant'"
              >
                <div
                  class="max-w-[85%] rounded-2xl px-4 py-2.5"
                  [class]="
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  "
                >
                  @if (msg.role === 'assistant') {
                    <div class="flex items-center gap-1.5 pb-1">
                      <i class="pi pi-sparkles text-xs text-purple-400"></i>
                      <span class="text-xs font-medium text-purple-500 dark:text-purple-400"
                        >Copilot</span
                      >
                    </div>
                  }
                  <div
                    class="whitespace-pre-wrap text-sm leading-relaxed"
                    [class.copilot-response]="msg.role === 'assistant'"
                  >
                    {{ msg.content }}
                  </div>
                  <p
                    class="mt-1 text-right text-[10px]"
                    [class.text-purple-200]="msg.role === 'user'"
                    [class.text-gray-400]="msg.role === 'assistant'"
                  >
                    {{ msg.createdAt | date: 'h:mm a' }}
                  </p>
                </div>
              </div>
            }

            <!-- Typing indicator -->
            @if (sending()) {
              <div class="flex justify-start">
                <div
                  class="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800"
                >
                  <i class="pi pi-sparkles text-xs text-purple-400"></i>
                  <div class="flex gap-1">
                    <span
                      class="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"
                    ></span>
                    <span
                      class="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"
                    ></span>
                    <span
                      class="inline-block h-2 w-2 animate-bounce rounded-full bg-gray-400"
                    ></span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Input area -->
          <div class="border-t border-gray-200 p-3 dark:border-gray-700">
            <div class="flex items-end gap-2">
              <textarea
                pTextarea
                [(ngModel)]="messageInput"
                class="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border-gray-300 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                placeholder="Ask Copilot anything..."
                [rows]="1"
                (keydown.enter)="onEnterKey($event)"
                [disabled]="sending()"
                aria-label="Type your message"
              ></textarea>
              <p-button
                icon="pi pi-send"
                [rounded]="true"
                [disabled]="!messageInput.trim() || sending()"
                (onClick)="send()"
                aria-label="Send message"
                severity="help"
              />
            </div>
          </div>
        }
      }
    </aside>
  `,
  styles: `
    :host {
      display: contents;
    }

    .copilot-response :is(h1, h2, h3, h4) {
      font-weight: 600;
      margin-top: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .copilot-response :is(ul, ol) {
      padding-left: 1.25rem;
      margin: 0.25rem 0;
    }

    .copilot-response li {
      margin-bottom: 0.15rem;
    }

    .copilot-response code {
      background: rgba(139, 92, 246, 0.15);
      padding: 0.1rem 0.3rem;
      border-radius: 0.25rem;
      font-size: 0.85em;
    }
  `,
})
export class CopilotChatPanelComponent {
  private readonly chatService = inject(CopilotChatService);
  private readonly messageContainer = viewChild<ElementRef<HTMLDivElement>>('messageContainer');

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  readonly conversations = this.chatService.conversations;
  readonly activeConversation = this.chatService.activeConversation;
  readonly sending = this.chatService.sending;

  readonly showHistory = signal(false);
  messageInput = '';

  private readonly hasMessages = computed(
    () => (this.activeConversation()?.messages?.length ?? 0) > 0,
  );

  close(): void {
    this.visibleChange.emit(false);
  }

  startNewConversation(): void {
    this.chatService.createConversation().subscribe(() => {
      this.showHistory.set(false);
    });
  }

  openConversation(conv: CopilotConversation): void {
    this.chatService.loadConversation(conv.id);
    this.showHistory.set(false);
  }

  deleteConversation(conv: CopilotConversation, event: Event): void {
    event.stopPropagation();
    this.chatService.deleteConversation(conv.id).subscribe();
  }

  send(): void {
    const content = this.messageInput.trim();
    if (!content) return;

    const convId = this.activeConversation()?.id;
    if (!convId) return;

    this.messageInput = '';
    this.chatService.sendMessage(convId, content).subscribe(() => {
      this.scrollToBottom();
    });

    // Scroll immediately for user message
    setTimeout(() => this.scrollToBottom(), 50);
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return; // Allow Shift+Enter for new lines
    ke.preventDefault();
    this.send();
  }

  private scrollToBottom(): void {
    const el = this.messageContainer()?.nativeElement;
    if (el) {
      setTimeout(() => {
        el.scrollTop = el.scrollHeight;
      }, 50);
    }
  }
}
