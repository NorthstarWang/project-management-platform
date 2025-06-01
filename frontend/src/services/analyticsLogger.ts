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
  private isClient = false;

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.isClient = true;
      this.initializeSession();
      this.setupBasicEventListeners();
    }
  }

  /**
   * Initialize session via synthetic API
   */
  private async initializeSession(): Promise<void> {
    if (!this.isClient) return;

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
    if (!this.isClient) return;

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

    // Mouseover events
    let mouseoverTimeout: ReturnType<typeof setTimeout>;
    document.addEventListener('mouseover', (event) => {
      const target = event.target as Element;
      
      // Only log mouseover for interactive elements
      const isInteractive = 
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('role') === 'button' ||
        target.getAttribute('data-testid')?.includes('draggable') ||
        target.getAttribute('data-testid')?.includes('droppable') ||
        target.classList.contains('cursor-pointer') ||
        target.classList.contains('hover:') ||
        (target.closest('[data-testid*="draggable"]') !== null);
      
      if (isInteractive) {
        clearTimeout(mouseoverTimeout);
        mouseoverTimeout = setTimeout(() => {
          this.logEvent('mouseover', {
            page_url: window.location.href,
            target_element_identifier: this.getElementIdentifier(target),
            coordinates: { x: event.clientX, y: event.clientY },
          });
        }, 100); // Debounce to avoid spam
      }
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

    // Set up storage tracking
    this.setupStorageTracking();

    // Set up DOM mutation observer
    this.setupDOMMutationObserver();
  }

  /**
   * Track localStorage and sessionStorage changes
   */
  private setupStorageTracking(): void {
    if (!this.isClient) return;

    // Send initial storage snapshot
    this.logStorageSnapshot();

    // Override localStorage methods
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalClear = localStorage.clear;

    localStorage.setItem = (key: string, value: string) => {
      originalSetItem.call(localStorage, key, value);
      this.logEvent('STORAGE_SET', {
        storageType: 'localStorage',
        key,
        value,
        page_url: window.location.href,
      });
    };

    localStorage.removeItem = (key: string) => {
      originalRemoveItem.call(localStorage, key);
      this.logEvent('STORAGE_REMOVE', {
        storageType: 'localStorage',
        key,
        page_url: window.location.href,
      });
    };

    localStorage.clear = () => {
      originalClear.call(localStorage);
      this.logEvent('STORAGE_CLEAR', {
        storageType: 'localStorage',
        page_url: window.location.href,
      });
    };

    // Override sessionStorage methods
    const originalSessionSetItem = sessionStorage.setItem;
    const originalSessionRemoveItem = sessionStorage.removeItem;
    const originalSessionClear = sessionStorage.clear;

    sessionStorage.setItem = (key: string, value: string) => {
      originalSessionSetItem.call(sessionStorage, key, value);
      this.logEvent('STORAGE_SET', {
        storageType: 'sessionStorage',
        key,
        value,
        page_url: window.location.href,
      });
    };

    sessionStorage.removeItem = (key: string) => {
      originalSessionRemoveItem.call(sessionStorage, key);
      this.logEvent('STORAGE_REMOVE', {
        storageType: 'sessionStorage',
        key,
        page_url: window.location.href,
      });
    };

    sessionStorage.clear = () => {
      originalSessionClear.call(sessionStorage);
      this.logEvent('STORAGE_CLEAR', {
        storageType: 'sessionStorage',
        page_url: window.location.href,
      });
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', (event) => {
      this.logEvent('STORAGE_EXTERNAL_CHANGE', {
        key: event.key,
        oldValue: event.oldValue,
        newValue: event.newValue,
        storageArea: event.storageArea === localStorage ? 'localStorage' : 'sessionStorage',
        url: event.url,
        page_url: window.location.href,
      });
    });
  }

  /**
   * Log current storage snapshot
   */
  private logStorageSnapshot(): void {
    if (!this.isClient) return;

    const localStorageData: Record<string, string> = {};
    const sessionStorageData: Record<string, string> = {};
    const cookiesData: Record<string, string> = {};

    // Capture localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageData[key] = localStorage.getItem(key) || '';
      }
    }

    // Capture sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionStorageData[key] = sessionStorage.getItem(key) || '';
      }
    }

    // Capture cookies
    document.cookie.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key) {
        cookiesData[key] = decodeURIComponent(value || '');
      }
    });

    this.logEvent('STORAGE_SNAPSHOT', {
      localStorage: localStorageData,
      sessionStorage: sessionStorageData,
      cookies: cookiesData,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set up DOM mutation observer
   */
  private setupDOMMutationObserver(): void {
    if (!this.isClient || typeof MutationObserver === 'undefined') return;

    let mutationTimeout: ReturnType<typeof setTimeout>;
    const mutations: MutationRecord[] = [];

    const observer = new MutationObserver((mutationsList) => {
      mutations.push(...mutationsList);
      
      // Debounce mutation logging
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        if (mutations.length > 0) {
          const summary = this.summarizeMutations(mutations);
          if (summary.hasSignificantChanges) {
            this.logEvent('DOM_MUTATION', {
              page_url: window.location.href,
              ...summary,
            });
          }
          mutations.length = 0; // Clear mutations array
        }
      }, 500);
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true,
    });
  }

  /**
   * Summarize DOM mutations to avoid spam
   */
  private summarizeMutations(mutations: MutationRecord[]): any {
    const summary = {
      hasSignificantChanges: false,
      addedNodes: 0,
      removedNodes: 0,
      attributeChanges: 0,
      textChanges: 0,
      significantElements: [] as string[],
    };

    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        summary.addedNodes += mutation.addedNodes.length;
        summary.removedNodes += mutation.removedNodes.length;
        
        // Track significant added elements
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const identifier = this.getElementIdentifier(element);
            if (element.getAttribute('data-testid') || 
                element.tagName === 'BUTTON' || 
                element.tagName === 'FORM' ||
                element.classList.contains('modal') ||
                element.classList.contains('task') ||
                element.classList.contains('board')) {
              summary.significantElements.push(identifier);
              summary.hasSignificantChanges = true;
            }
          }
        });
      } else if (mutation.type === 'attributes') {
        summary.attributeChanges++;
        // Track significant attribute changes
        if (mutation.attributeName === 'data-testid' ||
            mutation.attributeName === 'aria-expanded' ||
            mutation.attributeName === 'disabled') {
          summary.hasSignificantChanges = true;
        }
      } else if (mutation.type === 'characterData') {
        summary.textChanges++;
      }
    });

    // Consider changes significant if there are many of them or specific important changes
    if (summary.addedNodes > 5 || summary.removedNodes > 5 || summary.attributeChanges > 10) {
      summary.hasSignificantChanges = true;
    }

    return summary;
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
    if (!this.isClient) return;

    // Ensure page_url is always included
    if (!payload.page_url && typeof window !== 'undefined') {
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
    if (!this.sessionId || !this.isClient) return;

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
    if (!this.isInitialized || this.eventQueue.length === 0 || !this.isClient) return;

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
    if (!this.isClient) return;
    
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

  /**
   * Manually trigger a storage snapshot
   */
  public captureStorageSnapshot(): void {
    this.logStorageSnapshot();
  }

  /**
   * Log drag and drop events
   */
  public logDragEvent(eventType: 'start' | 'over' | 'end' | 'drop', data: any): void {
    this.logEvent(`drag_${eventType}`, {
      page_url: window.location.href,
      ...data,
    });
  }
}

// Create singleton instance
const analyticsLogger = new AnalyticsLogger();

// Export convenience functions with client-side checks
export const track = (actionType: string, payload?: LogPayload) => {
  if (typeof window !== 'undefined') {
    analyticsLogger.track(actionType, payload);
  }
};

export const pageView = (pageName?: string) => {
  if (typeof window !== 'undefined') {
    analyticsLogger.pageView(pageName);
  }
};

export const taskDone = (taskName: string, additionalData?: any) => {
  if (typeof window !== 'undefined') {
    analyticsLogger.taskDone(taskName, additionalData);
  }
};

export const userInteraction = (interactionType: string, elementSelector: string, data?: any) => {
  if (typeof window !== 'undefined') {
    analyticsLogger.userInteraction(interactionType, elementSelector, data);
  }
};

export const getSessionId = () => {
  if (typeof window !== 'undefined') {
    return analyticsLogger.getSessionId();
  }
  return null;
};

export const captureStorageSnapshot = () => {
  if (typeof window !== 'undefined') {
    analyticsLogger.captureStorageSnapshot();
  }
};

export const logDragEvent = (eventType: 'start' | 'over' | 'end' | 'drop', data: any) => {
  if (typeof window !== 'undefined') {
    analyticsLogger.logDragEvent(eventType, data);
  }
};

export default analyticsLogger; 