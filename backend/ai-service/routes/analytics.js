/**
 * Analytics API Routes
 * Handles ORION analytics tracking and behavioral insights
 */

const express = require('express');
const router = express.Router();

// Mock analytics data store (in production, this would be a database)
const analyticsStore = {
  events: [],
  insights: {},
  sessions: new Map()
};

// Track analytics events
router.post('/track', (req, res) => {
  try {
    const { event, data, userId, sessionId, timestamp } = req.body;
    
    // Validate required fields
    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Event type is required'
      });
    }

    // Store the event
    const analyticsEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      data: data || {},
      userId: userId || 'anonymous',
      sessionId: sessionId || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    analyticsStore.events.push(analyticsEvent);
    
    // Keep only last 1000 events to prevent memory issues
    if (analyticsStore.events.length > 1000) {
      analyticsStore.events = analyticsStore.events.slice(-1000);
    }

    console.log(`📊 Analytics event tracked: ${event} (user: ${analyticsEvent.userId})`);

    res.json({
      success: true,
      eventId: analyticsEvent.id,
      message: 'Event tracked successfully'
    });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

// Get behavioral insights
router.get('/behavioral-insights', (req, res) => {
  try {
    const { userId, timeframe = '24h' } = req.query;
    
    // Calculate timeframe
    const now = new Date();
    const timeframeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const cutoffTime = new Date(now.getTime() - (timeframeMs[timeframe] || timeframeMs['24h']));
    
    // Filter events by timeframe and user
    let filteredEvents = analyticsStore.events.filter(event => {
      const eventTime = new Date(event.timestamp);
      const timeMatch = eventTime >= cutoffTime;
      const userMatch = !userId || event.userId === userId;
      return timeMatch && userMatch;
    });

    // Generate insights
    const insights = {
      totalEvents: filteredEvents.length,
      uniqueUsers: new Set(filteredEvents.map(e => e.userId)).size,
      topEvents: getTopEvents(filteredEvents),
      userBehavior: getUserBehaviorPatterns(filteredEvents),
      timeframe,
      generatedAt: new Date().toISOString()
    };

    console.log(`🧠 Behavioral insights generated: ${insights.totalEvents} events analyzed`);

    res.json({
      success: true,
      insights,
      metadata: {
        eventsAnalyzed: filteredEvents.length,
        timeframe,
        userId: userId || 'all_users'
      }
    });

  } catch (error) {
    console.error('Behavioral insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights'
    });
  }
});

// Get analytics summary
router.get('/summary', (req, res) => {
  try {
    const summary = {
      totalEvents: analyticsStore.events.length,
      uniqueUsers: new Set(analyticsStore.events.map(e => e.userId)).size,
      activeSessions: analyticsStore.sessions.size,
      recentEvents: analyticsStore.events.slice(-10).map(e => ({
        event: e.event,
        userId: e.userId,
        timestamp: e.timestamp
      })),
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
});

// Helper functions
function getTopEvents(events) {
  const eventCounts = {};
  events.forEach(event => {
    eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
  });
  
  return Object.entries(eventCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([event, count]) => ({ event, count }));
}

function getUserBehaviorPatterns(events) {
  const patterns = {
    searchQueries: [],
    clickPatterns: [],
    timeSpent: {},
    preferences: {}
  };

  events.forEach(event => {
    switch (event.event) {
      case 'search':
        if (event.data.query) {
          patterns.searchQueries.push(event.data.query);
        }
        break;
      case 'click':
        patterns.clickPatterns.push({
          target: event.data.target,
          timestamp: event.timestamp
        });
        break;
      case 'page_view':
        const page = event.data.page || 'unknown';
        patterns.timeSpent[page] = (patterns.timeSpent[page] || 0) + 1;
        break;
    }
  });

  return patterns;
}

// Health check for analytics service
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'analytics',
    eventsStored: analyticsStore.events.length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
