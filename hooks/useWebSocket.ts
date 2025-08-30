import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface CampaignProgress {
  campaignId: string;
  sent: number;
  total: number;
  progress: number;
  errors: number;
  timestamp: string;
}

interface CampaignStatus {
  campaignId: string;
  status: string;
  message?: string;
  totalContacts?: number;
  sentCount?: number;
  errorCount?: number;
  timestamp: string;
}

interface CampaignError {
  campaignId: string;
  error: string;
  errorType: string;
  timestamp: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  joinCampaign: (campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
  campaignProgress: CampaignProgress | null;
  campaignStatus: CampaignStatus | null;
  campaignError: CampaignError | null;
  connectionError: string | null;
}

export const useWebSocket = (token: string | null): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatus | null>(null);
  const [campaignError, setCampaignError] = useState<CampaignError | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      console.log('No token available, skipping WebSocket connection');
      return;
    }

    // Initialize WebSocket connection
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    
    console.log('🔌 Connecting to WebSocket:', backendUrl);
    
    const socket = io(backendUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Campaign progress events
    socket.on('campaign_progress', (data: CampaignProgress) => {
      console.log('📊 Campaign progress received:', data);
      setCampaignProgress(data);
    });

    socket.on('campaign_status', (data: CampaignStatus) => {
      console.log('📋 Campaign status received:', data);
      setCampaignStatus(data);
    });

    socket.on('campaign_current_status', (data: any) => {
      console.log('📋 Campaign current status received:', data);
      setCampaignStatus({
        campaignId: data.campaignId,
        status: data.status,
        message: `${data.sentCount}/${data.totalContacts} mensajes enviados`,
        totalContacts: data.totalContacts,
        sentCount: data.sentCount,
        errorCount: data.errorCount,
        timestamp: data.timestamp
      });
      
      setCampaignProgress({
        campaignId: data.campaignId,
        sent: data.sentCount,
        total: data.totalContacts,
        progress: data.progress,
        errors: data.errorCount,
        timestamp: data.timestamp
      });
    });

    socket.on('campaign_error', (data: CampaignError) => {
      console.log('❌ Campaign error received:', data);
      setCampaignError(data);
    });

    // System messages
    socket.on('system_message', (data: any) => {
      console.log('📢 System message:', data);
      // You can handle system-wide messages here (maintenance notifications, etc.)
    });

    socket.on('connection_status', (data: any) => {
      console.log('🔗 Connection status:', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, [token]);

  const joinCampaign = (campaignId: string) => {
    if (socketRef.current && isConnected) {
      console.log('📊 Joining campaign room:', campaignId);
      socketRef.current.emit('join_campaign', campaignId);
      
      // Clear previous progress/status when joining new campaign
      setCampaignProgress(null);
      setCampaignStatus(null);
      setCampaignError(null);
    } else {
      console.warn('Cannot join campaign - socket not connected');
    }
  };

  const leaveCampaign = (campaignId: string) => {
    if (socketRef.current && isConnected) {
      console.log('📤 Leaving campaign room:', campaignId);
      socketRef.current.emit('leave_campaign', campaignId);
    }
  };

  return {
    isConnected,
    joinCampaign,
    leaveCampaign,
    campaignProgress,
    campaignStatus,
    campaignError,
    connectionError
  };
};