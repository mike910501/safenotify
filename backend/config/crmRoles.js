/**
 * 🔐 SISTEMA DE ROLES Y PERMISOS PARA WHATSAPP CRM
 * Definición completa de roles, permisos y configuraciones de seguridad
 */

// ============================================================================
// ROLES PREDEFINIDOS DEL SISTEMA
// ============================================================================

const CRM_ROLES = {
  SUPER_ADMIN: {
    name: 'super_admin',
    displayName: 'Super Administrador',
    description: 'Acceso completo a todo el sistema CRM',
    level: 100,
    color: '#ff0000'
  },
  
  ORG_ADMIN: {
    name: 'org_admin', 
    displayName: 'Administrador de Organización',
    description: 'Administra su organización completa',
    level: 90,
    color: '#ff6600'
  },
  
  MANAGER: {
    name: 'manager',
    displayName: 'Gerente',
    description: 'Supervisa equipos y métricas',
    level: 80,
    color: '#0066ff'
  },
  
  AGENT_SENIOR: {
    name: 'agent_senior',
    displayName: 'Agente Senior', 
    description: 'Agente experimentado con permisos avanzados',
    level: 70,
    color: '#00cc66'
  },
  
  AGENT: {
    name: 'agent',
    displayName: 'Agente',
    description: 'Agente básico de atención al cliente',
    level: 60,
    color: '#00cccc'
  },
  
  VIEWER: {
    name: 'viewer',
    displayName: 'Observador',
    description: 'Solo lectura de conversaciones',
    level: 50,
    color: '#999999'
  },
  
  CUSTOM: {
    name: 'custom',
    displayName: 'Personalizado',
    description: 'Permisos personalizados por organización',
    level: 0,
    color: '#6600cc'
  }
};

// ============================================================================
// PERMISOS GRANULARES DEL SISTEMA
// ============================================================================

const CRM_PERMISSIONS = {
  // Gestión de conversaciones
  CONVERSATIONS: {
    VIEW: 'conversations.view',
    VIEW_ALL: 'conversations.view_all', 
    CREATE: 'conversations.create',
    EDIT: 'conversations.edit',
    DELETE: 'conversations.delete',
    ASSIGN: 'conversations.assign',
    CLOSE: 'conversations.close',
    ARCHIVE: 'conversations.archive',
    EXPORT: 'conversations.export',
    BULK_ACTIONS: 'conversations.bulk_actions'
  },

  // Gestión de mensajes
  MESSAGES: {
    VIEW: 'messages.view',
    SEND: 'messages.send',
    EDIT: 'messages.edit', 
    DELETE: 'messages.delete',
    SEND_TEMPLATES: 'messages.send_templates',
    SEND_MEDIA: 'messages.send_media',
    VIEW_HISTORY: 'messages.view_history'
  },

  // Gestión de contactos/leads
  CONTACTS: {
    VIEW: 'contacts.view',
    VIEW_ALL: 'contacts.view_all',
    CREATE: 'contacts.create',
    EDIT: 'contacts.edit',
    DELETE: 'contacts.delete',
    IMPORT: 'contacts.import',
    EXPORT: 'contacts.export',
    MERGE: 'contacts.merge',
    VIEW_SENSITIVE_DATA: 'contacts.view_sensitive'
  },

  // Gestión de agentes IA
  AI_AGENTS: {
    VIEW: 'ai_agents.view',
    CREATE: 'ai_agents.create',
    EDIT: 'ai_agents.edit',
    DELETE: 'ai_agents.delete',
    CONFIGURE: 'ai_agents.configure',
    TRAIN: 'ai_agents.train',
    VIEW_PROMPTS: 'ai_agents.view_prompts',
    EDIT_PROMPTS: 'ai_agents.edit_prompts'
  },

  // Plantillas y automatizaciones
  TEMPLATES: {
    VIEW: 'templates.view',
    CREATE: 'templates.create',
    EDIT: 'templates.edit',
    DELETE: 'templates.delete',
    USE: 'templates.use'
  },

  AUTOMATIONS: {
    VIEW: 'automations.view',
    CREATE: 'automations.create',
    EDIT: 'automations.edit',
    DELETE: 'automations.delete',
    ENABLE_DISABLE: 'automations.enable_disable'
  },

  // Analytics y reportes
  ANALYTICS: {
    VIEW_BASIC: 'analytics.view_basic',
    VIEW_ADVANCED: 'analytics.view_advanced',
    EXPORT: 'analytics.export',
    VIEW_COSTS: 'analytics.view_costs',
    VIEW_TEAM_METRICS: 'analytics.view_team_metrics'
  },

  // Administración de usuarios
  USERS: {
    VIEW: 'users.view',
    CREATE: 'users.create', 
    EDIT: 'users.edit',
    DELETE: 'users.delete',
    ASSIGN_ROLES: 'users.assign_roles',
    VIEW_ACTIVITY: 'users.view_activity'
  },

  // Configuración organizacional
  ORGANIZATION: {
    VIEW_SETTINGS: 'org.view_settings',
    EDIT_SETTINGS: 'org.edit_settings',
    MANAGE_SUBSCRIPTION: 'org.manage_subscription',
    MANAGE_WHATSAPP: 'org.manage_whatsapp',
    VIEW_BILLING: 'org.view_billing'
  },

  // Integraciones y API
  INTEGRATIONS: {
    VIEW: 'integrations.view',
    CONFIGURE: 'integrations.configure',
    API_ACCESS: 'integrations.api_access'
  }
};

// ============================================================================
// MATRIZ DE PERMISOS POR ROL
// ============================================================================

const ROLE_PERMISSIONS = {
  [CRM_ROLES.SUPER_ADMIN.name]: [
    // Acceso completo a todo
    ...Object.values(CRM_PERMISSIONS.CONVERSATIONS),
    ...Object.values(CRM_PERMISSIONS.MESSAGES),
    ...Object.values(CRM_PERMISSIONS.CONTACTS),
    ...Object.values(CRM_PERMISSIONS.AI_AGENTS),
    ...Object.values(CRM_PERMISSIONS.TEMPLATES),
    ...Object.values(CRM_PERMISSIONS.AUTOMATIONS),
    ...Object.values(CRM_PERMISSIONS.ANALYTICS),
    ...Object.values(CRM_PERMISSIONS.USERS),
    ...Object.values(CRM_PERMISSIONS.ORGANIZATION),
    ...Object.values(CRM_PERMISSIONS.INTEGRATIONS)
  ],

  [CRM_ROLES.ORG_ADMIN.name]: [
    // Administración completa de su organización
    ...Object.values(CRM_PERMISSIONS.CONVERSATIONS),
    ...Object.values(CRM_PERMISSIONS.MESSAGES),
    ...Object.values(CRM_PERMISSIONS.CONTACTS),
    ...Object.values(CRM_PERMISSIONS.AI_AGENTS),
    ...Object.values(CRM_PERMISSIONS.TEMPLATES),
    ...Object.values(CRM_PERMISSIONS.AUTOMATIONS),
    ...Object.values(CRM_PERMISSIONS.ANALYTICS),
    CRM_PERMISSIONS.USERS.VIEW,
    CRM_PERMISSIONS.USERS.CREATE,
    CRM_PERMISSIONS.USERS.EDIT,
    CRM_PERMISSIONS.USERS.DELETE,
    CRM_PERMISSIONS.USERS.ASSIGN_ROLES,
    CRM_PERMISSIONS.USERS.VIEW_ACTIVITY,
    ...Object.values(CRM_PERMISSIONS.ORGANIZATION),
    CRM_PERMISSIONS.INTEGRATIONS.VIEW,
    CRM_PERMISSIONS.INTEGRATIONS.CONFIGURE
  ],

  [CRM_ROLES.MANAGER.name]: [
    // Supervisión de equipos y métricas
    CRM_PERMISSIONS.CONVERSATIONS.VIEW_ALL,
    CRM_PERMISSIONS.CONVERSATIONS.EDIT,
    CRM_PERMISSIONS.CONVERSATIONS.ASSIGN,
    CRM_PERMISSIONS.CONVERSATIONS.CLOSE,
    CRM_PERMISSIONS.CONVERSATIONS.ARCHIVE,
    CRM_PERMISSIONS.CONVERSATIONS.EXPORT,
    ...Object.values(CRM_PERMISSIONS.MESSAGES),
    CRM_PERMISSIONS.CONTACTS.VIEW_ALL,
    CRM_PERMISSIONS.CONTACTS.EDIT,
    CRM_PERMISSIONS.CONTACTS.EXPORT,
    CRM_PERMISSIONS.AI_AGENTS.VIEW,
    CRM_PERMISSIONS.AI_AGENTS.CONFIGURE,
    CRM_PERMISSIONS.AI_AGENTS.VIEW_PROMPTS,
    ...Object.values(CRM_PERMISSIONS.TEMPLATES),
    CRM_PERMISSIONS.AUTOMATIONS.VIEW,
    CRM_PERMISSIONS.AUTOMATIONS.EDIT,
    CRM_PERMISSIONS.AUTOMATIONS.ENABLE_DISABLE,
    ...Object.values(CRM_PERMISSIONS.ANALYTICS),
    CRM_PERMISSIONS.USERS.VIEW,
    CRM_PERMISSIONS.USERS.VIEW_ACTIVITY
  ],

  [CRM_ROLES.AGENT_SENIOR.name]: [
    // Agente con permisos avanzados
    CRM_PERMISSIONS.CONVERSATIONS.VIEW_ALL,
    CRM_PERMISSIONS.CONVERSATIONS.EDIT,
    CRM_PERMISSIONS.CONVERSATIONS.ASSIGN,
    CRM_PERMISSIONS.CONVERSATIONS.CLOSE,
    ...Object.values(CRM_PERMISSIONS.MESSAGES),
    CRM_PERMISSIONS.CONTACTS.VIEW_ALL,
    CRM_PERMISSIONS.CONTACTS.EDIT,
    CRM_PERMISSIONS.CONTACTS.CREATE,
    CRM_PERMISSIONS.AI_AGENTS.VIEW,
    CRM_PERMISSIONS.AI_AGENTS.VIEW_PROMPTS,
    ...Object.values(CRM_PERMISSIONS.TEMPLATES),
    CRM_PERMISSIONS.AUTOMATIONS.VIEW,
    CRM_PERMISSIONS.ANALYTICS.VIEW_BASIC,
    CRM_PERMISSIONS.ANALYTICS.VIEW_ADVANCED
  ],

  [CRM_ROLES.AGENT.name]: [
    // Agente básico
    CRM_PERMISSIONS.CONVERSATIONS.VIEW,
    CRM_PERMISSIONS.CONVERSATIONS.EDIT,
    CRM_PERMISSIONS.CONVERSATIONS.CLOSE,
    CRM_PERMISSIONS.MESSAGES.VIEW,
    CRM_PERMISSIONS.MESSAGES.SEND,
    CRM_PERMISSIONS.MESSAGES.SEND_TEMPLATES,
    CRM_PERMISSIONS.MESSAGES.SEND_MEDIA,
    CRM_PERMISSIONS.MESSAGES.VIEW_HISTORY,
    CRM_PERMISSIONS.CONTACTS.VIEW,
    CRM_PERMISSIONS.CONTACTS.EDIT,
    CRM_PERMISSIONS.CONTACTS.CREATE,
    CRM_PERMISSIONS.AI_AGENTS.VIEW,
    CRM_PERMISSIONS.TEMPLATES.VIEW,
    CRM_PERMISSIONS.TEMPLATES.USE,
    CRM_PERMISSIONS.ANALYTICS.VIEW_BASIC
  ],

  [CRM_ROLES.VIEWER.name]: [
    // Solo lectura
    CRM_PERMISSIONS.CONVERSATIONS.VIEW,
    CRM_PERMISSIONS.MESSAGES.VIEW,
    CRM_PERMISSIONS.MESSAGES.VIEW_HISTORY,
    CRM_PERMISSIONS.CONTACTS.VIEW,
    CRM_PERMISSIONS.AI_AGENTS.VIEW,
    CRM_PERMISSIONS.TEMPLATES.VIEW,
    CRM_PERMISSIONS.AUTOMATIONS.VIEW,
    CRM_PERMISSIONS.ANALYTICS.VIEW_BASIC
  ]
};

// ============================================================================
// FUNCIONES DE VALIDACIÓN DE PERMISOS
// ============================================================================

/**
 * Verifica si un usuario tiene un permiso específico
 */
function hasPermission(userRole, userPermissions, requiredPermission) {
  // Si es super admin, tiene todos los permisos
  if (userRole === CRM_ROLES.SUPER_ADMIN.name) {
    return true;
  }

  // Si es rol personalizado, verifica permisos individuales
  if (userRole === CRM_ROLES.CUSTOM.name) {
    return userPermissions && userPermissions.includes(requiredPermission);
  }

  // Para roles predefinidos, verifica en la matriz
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(requiredPermission);
}

/**
 * Verifica múltiples permisos (requiere TODOS)
 */
function hasAllPermissions(userRole, userPermissions, requiredPermissions) {
  return requiredPermissions.every(permission => 
    hasPermission(userRole, userPermissions, permission)
  );
}

/**
 * Verifica múltiples permisos (requiere AL MENOS UNO)
 */
function hasAnyPermission(userRole, userPermissions, requiredPermissions) {
  return requiredPermissions.some(permission => 
    hasPermission(userRole, userPermissions, permission)
  );
}

/**
 * Obtiene todos los permisos de un rol
 */
function getRolePermissions(roleName) {
  if (roleName === CRM_ROLES.SUPER_ADMIN.name) {
    return Object.values(CRM_PERMISSIONS).flatMap(category => Object.values(category));
  }
  
  return ROLE_PERMISSIONS[roleName] || [];
}

/**
 * Valida si un usuario puede acceder a una conversación específica
 */
function canAccessConversation(user, conversation) {
  // Super admin y org admin pueden ver todo
  if ([CRM_ROLES.SUPER_ADMIN.name, CRM_ROLES.ORG_ADMIN.name].includes(user.role)) {
    return true;
  }

  // Manager puede ver todas las conversaciones de su organización
  if (user.role === CRM_ROLES.MANAGER.name && 
      hasPermission(user.role, user.permissions, CRM_PERMISSIONS.CONVERSATIONS.VIEW_ALL)) {
    return conversation.organizationId === user.organizationId;
  }

  // Otros roles solo ven sus conversaciones asignadas o las que pueden ver por permisos
  if (hasPermission(user.role, user.permissions, CRM_PERMISSIONS.CONVERSATIONS.VIEW_ALL)) {
    return conversation.organizationId === user.organizationId;
  }

  // Solo conversaciones asignadas
  return conversation.assignedUserId === user.id && 
         hasPermission(user.role, user.permissions, CRM_PERMISSIONS.CONVERSATIONS.VIEW);
}

/**
 * Filtra conversaciones según permisos del usuario
 */
function filterConversationsByPermissions(user, conversations) {
  return conversations.filter(conversation => canAccessConversation(user, conversation));
}

// ============================================================================
// MIDDLEWARE DE AUTORIZACIÓN
// ============================================================================

/**
 * Middleware para verificar permisos específicos
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(user.role, user.permissions, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        userRole: user.role 
      });
    }

    next();
  };
}

/**
 * Middleware para verificar múltiples permisos (requiere todos)
 */
function requireAllPermissions(permissions) {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasAllPermissions(user.role, user.permissions, permissions)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions,
        userRole: user.role 
      });
    }

    next();
  };
}

/**
 * Middleware para verificar rol mínimo
 */
function requireMinRole(minRole) {
  return (req, res, next) => {
    const user = req.user;
    const userRoleLevel = Object.values(CRM_ROLES).find(r => r.name === user.role)?.level || 0;
    const minRoleLevel = Object.values(CRM_ROLES).find(r => r.name === minRole)?.level || 0;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (userRoleLevel < minRoleLevel) {
      return res.status(403).json({ 
        error: 'Insufficient role level',
        required: minRole,
        userRole: user.role 
      });
    }

    next();
  };
}

// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {
  CRM_ROLES,
  CRM_PERMISSIONS,
  ROLE_PERMISSIONS,
  
  // Funciones de validación
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  canAccessConversation,
  filterConversationsByPermissions,
  
  // Middleware
  requirePermission,
  requireAllPermissions,
  requireMinRole
};