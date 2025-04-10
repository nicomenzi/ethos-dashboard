import React, { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { inject } from '@vercel/analytics';

// This component provides a wrapper around Vercel Analytics with additional functionality
const AnalyticsWrapper = ({ children }) => {
  useEffect(() => {
    // Manually inject Analytics for SPA navigation support
    inject();

    // Track initial page view
    trackPageView();

    // Set up custom event listeners if needed
    const handleUserAction = () => {
      // Example of tracking a custom event
      trackEvent('user_interaction', {
        page: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
    };

    // Clean up event listeners
    return () => {
      // Remove any custom event listeners if added
    };
  }, []);

  // Helper function to track page views
  const trackPageView = () => {
    if (typeof window !== 'undefined') {
      // Track page view with any additional data you might want
      const path = window.location.pathname;
      console.log('📊 Tracking page view:', path);
    }
  };

  // Helper function to track custom events
  const trackEvent = (eventName, data = {}) => {
    console.log(`📊 Tracking event: ${eventName}`, data);
    // Vercel Analytics will automatically track this
  };

  return (
    <>
      {children}
      <Analytics debug={process.env.NODE_ENV === 'development'} />
    </>
  );
};

export default AnalyticsWrapper;
