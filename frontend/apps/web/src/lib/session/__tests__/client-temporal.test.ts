/**
 * Integration Tests for Session Client with Temporal Filtering
 */

import { getUserSessions, type SessionFilterOptions } from '../client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Session Client - Temporal Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch sessions without filters (backward compatibility)', async () => {
    const mockSessions = [
      { sessionId: '1', userId: 'user123', title: 'Session 1', messageCount: 5 }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions: mockSessions })
    });

    const sessions = await getUserSessions('user123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/list?userId=user123')
    );
    expect(sessions).toEqual(mockSessions);
  });

  it('should fetch sessions from yesterday', async () => {
    const yesterday = subDays(new Date(), 1);
    const options: SessionFilterOptions = {
      startDate: startOfDay(yesterday),
      endDate: endOfDay(yesterday),
      limit: 20
    };

    const mockSessions = [
      { sessionId: '1', userId: 'user123', title: 'Yesterday Session', messageCount: 5 }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessions: mockSessions })
    });

    const sessions = await getUserSessions('user123', options);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('startDate=');
    expect(fetchCall).toContain('endDate=');
    expect(fetchCall).toContain('limit=20');
    expect(sessions).toEqual(mockSessions);
  });
});
