import React from 'react';
import { 
  MessageSquare, 
  Phone, 
  Bot, 
  Eye, 
  Archive, 
  Trash2,
  Clock,
  CheckCheck,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationCardProps {
  conversation: {
    id: string;
    customerLead: {
      name?: string;
      phone: string;
      email?: string;
    };
    status: string;
    messageCount: number;
    lastActivity: string;
    currentAgent?: {
      name: string;
      model?: string;
    };
    agentName?: string;
    qualificationScore?: number;
    unreadCount?: number;
    lastMessage?: string;
    isTyping?: boolean;
  };
  onView: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

const ConversationCard: React.FC<ConversationCardProps> = ({ 
  conversation, 
  onView, 
  onArchive, 
  onDelete 
}) => {
  const score = conversation.qualificationScore || 0;
  
  // Determinar color del score
  const getScoreStyle = () => {
    if (score >= 70) return {
      badge: 'bg-red-100 text-red-800',
      label: '🔥 HOT',
      border: 'from-red-500 to-orange-500'
    };
    if (score >= 40) return {
      badge: 'bg-yellow-100 text-yellow-800',
      label: '🌡️ WARM',
      border: 'from-yellow-500 to-orange-500'
    };
    return {
      badge: 'bg-blue-100 text-blue-800',
      label: '❄️ COLD',
      border: 'from-blue-500 to-cyan-500'
    };
  };

  const scoreStyle = getScoreStyle();
  const clientName = conversation.customerLead?.name || 'Cliente';
  const phoneNumber = conversation.customerLead?.phone || '';
  const agentName = conversation.currentAgent?.name || conversation.agentName || 'Sin asignar';
  
  // Formatear tiempo
  const formatTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true,
        locale: es 
      });
    } catch {
      return date;
    }
  };

  return (
    <div 
      className="relative bg-white rounded-xl shadow-sm hover:shadow-lg 
        transition-all duration-300 overflow-hidden group cursor-pointer
        border border-gray-100 hover:border-gray-200"
      onClick={() => onView(conversation.id)}
    >
      {/* Score Indicator Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${scoreStyle.border}`} />
      
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 
                rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {clientName[0]?.toUpperCase() || '?'}
              </div>
              {/* Status indicator */}
              {conversation.status === 'ACTIVE' && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 
                  rounded-full border-2 border-white animate-pulse" />
              )}
              {conversation.isTyping && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-gray-200">
                  <div className="flex space-x-0.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
            
            {/* Client Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {clientName}
              </h3>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {phoneNumber.replace('whatsapp:', '')}
              </p>
            </div>
          </div>
          
          {/* Score Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${scoreStyle.badge}`}>
            {scoreStyle.label} {score}
          </div>
        </div>
      </div>
      
      {/* Last Message Preview */}
      <div className="p-4 flex-1">
        <div className="flex items-start space-x-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600 line-clamp-2">
              {conversation.lastMessage || 'Sin mensajes aún...'}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">
                <Clock className="w-3 h-3 inline mr-1" />
                {formatTimeAgo(conversation.lastActivity)}
              </span>
              {conversation.unreadCount && conversation.unreadCount > 0 && (
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 
                  rounded-full font-semibold min-w-[20px] text-center">
                  {conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Footer with Actions */}
      <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50">
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {conversation.messageCount}
          </span>
          <span className="text-gray-300">•</span>
          <span className="flex items-center gap-1 truncate max-w-[120px]">
            <Bot className="w-3 h-3" />
            {agentName}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 
          transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button 
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => onView(conversation.id)}
            title="Ver conversación"
          >
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => onArchive(conversation.id)}
            title="Archivar"
          >
            <Archive className="w-4 h-4 text-gray-600" />
          </button>
          <button 
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
            onClick={() => onDelete(conversation.id)}
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationCard;