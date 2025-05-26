/**
 * Simple React Hook for Analytics Logging
 * 
 * Provides basic analytics functionality for React components
 */

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { track, pageView, taskDone, userInteraction, getSessionId, LogPayload } from '../services/analyticsLogger';

export interface UseAnalyticsOptions {
  trackPageViews?: boolean;
  componentName?: string;
}

export interface AnalyticsHook {
  track: (actionType: string, payload?: LogPayload) => void;
  pageView: (pageName?: string) => void;
  taskDone: (taskName: string, additionalData?: any) => void;
  userInteraction: (interactionType: string, elementSelector: string, data?: any) => void;
  getSessionId: () => string | null;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): AnalyticsHook {
  const { trackPageViews = true, componentName } = options;
  const router = useRouter();

  // Track page views automatically
  useEffect(() => {
    if (trackPageViews) {
      const handleRouteChange = (url: string) => {
        pageView(url);
      };

      // Track initial page view
      handleRouteChange(router.asPath);

      // Track subsequent route changes
      router.events.on('routeChangeComplete', handleRouteChange);

      return () => {
        router.events.off('routeChangeComplete', handleRouteChange);
      };
    }
  }, [router, trackPageViews]);

  // Memoized analytics functions
  const trackWithContext = useCallback((actionType: string, payload?: LogPayload) => {
    const enhancedPayload = {
      component_name: componentName,
      route: router.asPath,
      ...payload,
    };
    
    track(actionType, enhancedPayload);
  }, [router.asPath, componentName]);

  const pageViewWithContext = useCallback((pageName?: string) => {
    pageView(pageName || router.asPath);
  }, [router.asPath]);

  const userInteractionWithContext = useCallback((interactionType: string, elementSelector: string, data?: any) => {
    const enhancedData = {
      component_name: componentName,
      route: router.asPath,
      ...data,
    };
    
    userInteraction(interactionType, elementSelector, enhancedData);
  }, [router.asPath, componentName]);

  return {
    track: trackWithContext,
    pageView: pageViewWithContext,
    taskDone,
    userInteraction: userInteractionWithContext,
    getSessionId,
  };
}

/**
 * Hook for tracking form interactions
 */
export function useFormAnalytics(formName: string) {
  const { track } = useAnalytics();

  const trackFormSubmit = useCallback((data?: any) => {
    track('form_submit', {
      form_name: formName,
      ...data,
    });
  }, [formName, track]);

  const trackFieldChange = useCallback((fieldName: string, value: any) => {
    track('form_field_change', {
      form_name: formName,
      field_name: fieldName,
      field_value: fieldName.toLowerCase().includes('password') ? '[REDACTED]' : value,
    });
  }, [formName, track]);

  return {
    trackFormSubmit,
    trackFieldChange,
  };
}

/**
 * Hook for tracking button clicks
 */
export function useClickAnalytics() {
  const { userInteraction } = useAnalytics();

  const trackButtonClick = useCallback((buttonName: string, data?: any) => {
    userInteraction('button_click', `[data-testid="${buttonName}"]`, data);
  }, [userInteraction]);

  const trackLinkClick = useCallback((linkText: string, href: string) => {
    userInteraction('link_click', `a[href="${href}"]`, {
      link_text: linkText,
      href,
    });
  }, [userInteraction]);

  return {
    trackButtonClick,
    trackLinkClick,
  };
} 