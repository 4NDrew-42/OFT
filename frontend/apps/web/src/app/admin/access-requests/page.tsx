"use client";

import { useEffect, useState } from 'react';
import { 
  UserCheck, 
  Check, 
  X, 
  Clock, 
  Mail, 
  Calendar,
  Globe,
  Monitor,
  Filter,
  Search
} from 'lucide-react';
import { GlassPanel, GlassButton, NebulaBackground } from '@/components/ui/glass-components';
import { AdminNavigation } from '@/components/admin/admin-navigation';

interface AccessRequest {
  id: string;
  email: string;
  name: string;
  provider: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAccessRequests();
  }, []);

  const loadAccessRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/access-requests');
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data);
      } else {
        console.error('Failed to load access requests:', data.error);
      }
    } catch (error) {
      console.error('Error loading access requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (
    requestId: string, 
    action: 'approved' | 'denied',
    notes?: string
  ) => {
    try {
      setProcessingIds(prev => new Set(prev).add(requestId));
      
      const response = await fetch('/api/admin/access-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status: action,
          notes: notes || ''
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the request in the local state
        setRequests(prev => prev.map(req => 
          req.id === requestId ? data.data : req
        ));
        
        // Show success message
        console.log(`Request ${action} successfully`);
      } else {
        console.error(`Failed to ${action} request:`, data.error);
      }
    } catch (error) {
      console.error(`Error ${action} request:`, error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesFilter = filter === 'all' || request.status === filter;
    const matchesSearch = searchTerm === '' || 
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: AccessRequest['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'denied':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <NebulaBackground variant="dashboard" className="min-h-screen">
      <div className="flex">
        <AdminNavigation />
        
        <div className="flex-1 p-6 ml-64">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Access Requests
                </h1>
                <p className="text-white/60">
                  Review and manage user access requests
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-white/60">
                  {filteredRequests.length} of {requests.length} requests
                </div>
                
                <GlassButton 
                  variant="secondary" 
                  size="sm"
                  onClick={loadAccessRequests}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </GlassButton>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400/50"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'denied'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status !== 'all' && (
                    <span className="ml-2 text-xs">
                      ({requests.filter(r => r.status === status).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <GlassPanel key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded mb-2"></div>
                  <div className="h-6 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <GlassPanel className="p-12 text-center">
              <UserCheck className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No Access Requests
              </h3>
              <p className="text-white/60">
                {filter === 'all' 
                  ? 'No access requests found'
                  : `No ${filter} requests found`
                }
              </p>
            </GlassPanel>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <GlassPanel key={request.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">
                              {request.name || 'Unknown User'}
                            </h3>
                            <p className="text-sm text-white/60">{request.email}</p>
                          </div>
                        </div>
                        
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                          {request.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/60 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Requested: {formatDate(request.timestamp)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>Provider: {request.provider}</span>
                        </div>
                        
                        {request.ipAddress && (
                          <div className="flex items-center gap-2">
                            <Monitor className="w-4 h-4" />
                            <span>IP: {request.ipAddress}</span>
                          </div>
                        )}
                      </div>

                      {request.reviewedBy && (
                        <div className="text-sm text-white/60 mb-4">
                          Reviewed by {request.reviewedBy} on {formatDate(request.reviewedAt!)}
                          {request.notes && (
                            <div className="mt-2 p-3 bg-white/5 rounded-lg">
                              <strong>Notes:</strong> {request.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <GlassButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleRequestAction(request.id, 'approved')}
                          disabled={processingIds.has(request.id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </GlassButton>
                        
                        <GlassButton
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRequestAction(request.id, 'denied')}
                          disabled={processingIds.has(request.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Deny
                        </GlassButton>
                      </div>
                    )}
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}
        </div>
      </div>
    </NebulaBackground>
  );
}
