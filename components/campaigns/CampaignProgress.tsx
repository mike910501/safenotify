'use client'

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { CheckCircle, XCircle, Clock, AlertTriangle, Pause, Play, Wifi, WifiOff } from 'lucide-react';

interface CampaignProgressProps {
  campaignId: string;
  token: string | null;
  initialStatus?: string;
  onStatusChange?: (status: string) => void;
}

interface ProgressStats {
  sent: number;
  total: number;
  errors: number;
  progress: number;
  status: string;
  message?: string;
}

export default function CampaignProgress({ 
  campaignId, 
  token, 
  initialStatus = 'queued',
  onStatusChange 
}: CampaignProgressProps) {
  const { 
    isConnected, 
    joinCampaign, 
    leaveCampaign, 
    campaignProgress, 
    campaignStatus, 
    campaignError,
    connectionError
  } = useWebSocket(token);
  
  const [stats, setStats] = useState<ProgressStats>({
    sent: 0,
    total: 0,
    errors: 0,
    progress: 0,
    status: initialStatus,
    message: 'Inicializando...'
  });

  const [isVisible, setIsVisible] = useState(true);

  // Join campaign room on mount
  useEffect(() => {
    if (isConnected && campaignId) {
      joinCampaign(campaignId);
    }
    
    return () => {
      if (campaignId) {
        leaveCampaign(campaignId);
      }
    };
  }, [isConnected, campaignId, joinCampaign, leaveCampaign]);

  // Update stats when progress data changes
  useEffect(() => {
    if (campaignProgress && campaignProgress.campaignId === campaignId) {
      setStats(prev => ({
        ...prev,
        sent: campaignProgress.sent,
        total: campaignProgress.total,
        errors: campaignProgress.errors,
        progress: campaignProgress.progress
      }));
    }
  }, [campaignProgress, campaignId]);

  // Update status when status data changes
  useEffect(() => {
    if (campaignStatus && campaignStatus.campaignId === campaignId) {
      setStats(prev => ({
        ...prev,
        status: campaignStatus.status,
        message: campaignStatus.message || getStatusMessage(campaignStatus.status)
      }));
      
      // Notify parent component of status change
      if (onStatusChange) {
        onStatusChange(campaignStatus.status);
      }
    }
  }, [campaignStatus, campaignId, onStatusChange]);

  // Handle errors
  useEffect(() => {
    if (campaignError && campaignError.campaignId === campaignId) {
      setStats(prev => ({
        ...prev,
        status: 'failed',
        message: campaignError.error
      }));
    }
  }, [campaignError, campaignId]);

  const getStatusMessage = (status: string): string => {
    switch (status) {
      case 'queued':
        return 'En cola de envío...';
      case 'processing':
        return 'Enviando mensajes...';
      case 'completed':
        return 'Campaña completada exitosamente';
      case 'completed_with_errors':
        return 'Campaña completada con algunos errores';
      case 'failed':
        return 'Error en la campaña';
      case 'paused':
        return 'Campaña pausada';
      default:
        return 'Estado desconocido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'completed_with_errors':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'paused':
        return <Pause className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-50 border-yellow-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'completed_with_errors':
        return 'bg-orange-50 border-orange-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'paused':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`rounded-xl border-2 p-6 transition-all duration-300 ${getStatusColor(stats.status)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(stats.status)}
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Progreso de Campaña
            </h3>
            <p className="text-sm text-gray-600">
              {stats.message}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className="flex items-center space-x-1 text-xs">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          
          {/* Minimize Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Minimizar"
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progreso: {stats.progress}%</span>
          <span>{stats.sent} / {stats.total} mensajes</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${getProgressColor(stats.progress)}`}
            style={{ width: `${Math.min(stats.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          <div className="text-xs text-gray-600">Enviados</div>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          <div className="text-xs text-gray-600">Errores</div>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{Math.max(0, stats.total - stats.sent - stats.errors)}</div>
          <div className="text-xs text-gray-600">Pendientes</div>
        </div>
      </div>

      {/* Error Display */}
      {campaignError && campaignError.campaignId === campaignId && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {campaignError.error}
            </div>
          </div>
        </div>
      )}

      {/* Connection Error Display */}
      {connectionError && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <div className="text-sm text-yellow-700">
              <strong>Conexión:</strong> {connectionError}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimized progress indicator
export function MinimizedCampaignProgress({ 
  campaignId, 
  onExpand, 
  progress = 0, 
  status = 'queued' 
}: {
  campaignId: string;
  onExpand: () => void;
  progress?: number;
  status?: string;
}) {
  return (
    <div 
      className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border-2 border-blue-200 p-3 cursor-pointer hover:shadow-xl transition-all"
      onClick={onExpand}
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 relative">
          <div className="w-full h-full border-2 border-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-600">
            {progress}%
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-800">Campaña</div>
          <div className="text-xs text-gray-600">{status}</div>
        </div>
      </div>
    </div>
  );
}