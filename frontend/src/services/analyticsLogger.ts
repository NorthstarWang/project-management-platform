/**
 * Simple Analytics Logger for Project Management Platform
 * 
 * Implements the event logging requirements from the project documentation:
 * - Logs user actions and application events to /_synthetic/log_event
 * - Provides structured JSON format with required fields
 * - Automatic session management via /_synthetic/new_session
 */

export interface LogPayload {
  page_url?: string;
  target_element_identifier?: string;
  [key: string]: any;
}

class AnalyticsLogger {
  private sessionId: string | null = null;
  private isInitialized = false;
  private eventQueue: Array<{ actionType: string; payload: LogPayload }> = [];

  constructor() {
    this.initializeSession();
    this.setupBasicEventListeners();
  }

  /**
   * Initialize session via synthetic API
   */
  private async initializeSession(): Promise<void> {
    try {
      const response = await fetch('http://localhost:8000/_synthetic/new_session', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        this.sessionId = data.session_id;
      } else {
        // Fallback session ID
        this.sessionId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      this.isInitialized = true;
      this.flushEventQueue();
      
      // Log session start
      this.logEvent('session_start', {
        user_agent: navigator.userAgent,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      });
    } catch (error) {
      console.error('Failed to initialize session:', error);
      this.sessionId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.isInitialized = true;
    }
  }

  /**
   * Set up basic event listeners for required user actions
   */
  private setupBasicEventListeners(): void {
    // Click events
    document.addEventListener('click', (event) => {
      const target = event.target as Element;
      this.logEvent('click', {
        page_url: window.location.href,
        target_element_identifier: this.getElementIdentifier(target),
        coordinates: { x: event.clientX, y: event.clientY },
        button: event.button,
      });
    }, true);

    // Keystrokes (excluding sensitive data)
    document.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement;
      const isPasswordField = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'password';
      
      this.logEvent('keydown', {
        page_url: window.location.href,
        target_element_identifier: this.getElementIdentifier(target),
        key: isPasswordField ? '[REDACTED]' : event.key,
        code: event.code,
      });
    }, true);

    // Form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.logEvent('form_submit', {
        page_url: window.location.href,
        target_element_identifier: this.getElementIdentifier(form),
        form_action: form.action,
        form_method: form.method,
      });
    }, true);

    // Scroll events (throttled)
    let scrollTimeout: ReturnType<typeof setTimeout>;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.logEvent('scroll', {
          page_url: window.location.href,
          scroll_x: window.scrollX,
          scroll_y: window.scrollY,
        });
      }, 250);
    });

    // Focus changes
    document.addEventListener('focusin', (event) => {
      const target = event.target as Element;
      this.logEvent('focus', {
        page_url: window.location.href,
        target_element_identifier: this.getElementIdentifier(target),
      });
    }, true);

    // Page loads
    window.addEventListener('load', () => {
      this.logEvent('page_load', {
        page_url: window.location.href,
        load_time: performance.now(),
      });
    });

    // Navigation (for SPAs)
    window.addEventListener('popstate', () => {
      this.logEvent('navigate', {
        page_url: window.location.href,
        type: 'popstate',
      });
    });
  }

  /**
   * Generate element identifier (prioritizing data-testid)
   */
  private getElementIdentifier(element: Element): string {
    // 1. data-testid (highest priority)
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }
    
    // 2. id attribute
    if (element.id) {
      return `#${element.id}`;
    }
    
    // 3. aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `[aria-label="${ariaLabel}"]`;
    }
    
    // 4. CSS selector fallback
    let selector = element.tagName.toLowerCase();
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    return selector;
  }

  /**
   * Main logging method - sends to /_synthetic/log_event
   */
  public logEvent(actionType: string, payload: LogPayload = {}): void {
    // Ensure page_url is always included
    if (!payload.page_url) {
      payload.page_url = window.location.href;
    }

    const logData = {
      actionType,
      payload,
    };

    if (this.isInitialized && this.sessionId) {
      this.sendLogEntry(logData);
    } else {
      this.eventQueue.push(logData);
    }
  }

  /**
   * Send log entry to backend
   */
  private async sendLogEntry(logData: { actionType: string; payload: LogPayload }): Promise<void> {
    if (!this.sessionId) return;

    try {
      await fetch(`http://localhost:8000/_synthetic/log_event?session_id=${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });
    } catch (error) {
      console.error('Error sending log entry:', error);
      // Re-queue for retry
      this.eventQueue.push(logData);
    }
  }

  /**
   * Flush queued events
   */
  private async flushEventQueue(): Promise<void> {
    if (!this.isInitialized || this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of eventsToSend) {
      await this.sendLogEntry(event);
    }
  }

  /**
   * Public API methods
   */

  /**
   * Log custom event
   */
  public track(actionType: string, payload: LogPayload = {}): void {
    this.logEvent(actionType, payload);
  }

  /**
   * Log page view
   */
  public pageView(pageName?: string): void {
    this.logEvent('page_view', {
      page_name: pageName,
      page_title: document.title,
      referrer: document.referrer,
    });
  }

  /**
   * Log task completion (for verification)
   */
  public taskDone(taskName: string, additionalData?: any): void {
    this.logEvent('TASK_DONE', {
      taskName,
      ...additionalData,
    });
  }

  /**
   * Log user interaction with specific element
   */
  public userInteraction(interactionType: string, elementSelector: string, data?: any): void {
    this.logEvent('user_interaction', {
      interaction_type: interactionType,
      target_element_identifier: elementSelector,
      ...data,
    });
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }
}

// Create singleton instance
const analyticsLogger = new AnalyticsLogger();

// Export convenience functions
export const track = (actionType: string, payload?: LogPayload) => analyticsLogger.track(actionType, payload);
export const pageView = (pageName?: string) => analyticsLogger.pageView(pageName);
export const taskDone = (taskName: string, additionalData?: any) => analyticsLogger.taskDone(taskName, additionalData);
export const userInteraction = (interactionType: string, elementSelector: string, data?: any) => analyticsLogger.userInteraction(interactionType, elementSelector, data);
export const getSessionId = () => analyticsLogger.getSessionId();

export default analyticsLogger; 