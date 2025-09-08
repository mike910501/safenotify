-- ============================================================================
-- 🚀 MIGRACIÓN CRM: Extensión de Base de Datos para CRM de Clientes
-- Versión: 001 - CRM Tables Creation
-- Fecha: 2024-01-01
-- Descripción: Agrega sistema CRM completo para que cada User gestione SUS clientes
-- ============================================================================

-- ============================================================================
-- 1. EXTENDER TABLA USERS (Agregar campos CRM)
-- ============================================================================

-- Agregar campos CRM a tabla users existente
ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS crm_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_agents INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_whatsapp_numbers INTEGER DEFAULT 1;

-- Crear índices para nuevos campos
CREATE INDEX IF NOT EXISTS idx_users_crm_enabled ON users(crm_enabled);
CREATE INDEX IF NOT EXISTS idx_users_crm_plan ON users(crm_plan);

-- ============================================================================
-- 2. TABLA: NÚMEROS WHATSAPP POR USER
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_whatsapp_numbers (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Número WhatsApp
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    
    -- Configuración
    is_active BOOLEAN DEFAULT TRUE,
    is_primary BOOLEAN DEFAULT FALSE,
    
    -- Webhook & Twilio
    webhook_url TEXT,
    twilio_sid VARCHAR(50),
    
    -- Configuración de horarios
    business_hours JSONB,
    timezone VARCHAR(50) DEFAULT 'America/Bogota',
    auto_reply BOOLEAN DEFAULT TRUE,
    
    -- Agente por defecto
    default_agent_id VARCHAR(30),
    
    -- Métricas
    total_messages INTEGER DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_whatsapp_numbers
CREATE INDEX IF NOT EXISTS idx_user_whatsapp_numbers_user_id ON user_whatsapp_numbers(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_whatsapp_numbers_phone ON user_whatsapp_numbers(phone_number);

-- Constraint: Solo un número primario por user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_whatsapp_primary 
ON user_whatsapp_numbers(user_id) 
WHERE is_primary = TRUE;

-- ============================================================================
-- 3. TABLA: AGENTES IA POR USER
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_ai_agents (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configuración básica
    name VARCHAR(100) NOT NULL,
    description TEXT,
    role VARCHAR(50) DEFAULT 'assistant',
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Personalidad y prompts
    personality_prompt TEXT NOT NULL,
    business_prompt TEXT NOT NULL,
    objectives_prompt TEXT NOT NULL,
    
    -- Configuración de IA
    model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens_per_message INTEGER DEFAULT 500,
    response_style JSONB,
    
    -- Reglas de negocio
    business_rules JSONB DEFAULT '{}',
    trigger_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Restricciones horarias
    active_hours JSONB,
    weekdays_only BOOLEAN DEFAULT FALSE,
    
    -- Métricas de rendimiento
    total_conversations INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    avg_response_time DECIMAL(8,2) DEFAULT 0,
    satisfaction_rating DECIMAL(3,2) DEFAULT 0,
    
    -- Costos
    total_tokens_used INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_ai_agents
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_agents_unique_name 
ON user_ai_agents(user_id, name);

CREATE INDEX IF NOT EXISTS idx_user_ai_agents_user_active 
ON user_ai_agents(user_id, is_active);

-- Constraint: Solo un agente default por user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_ai_agents_default 
ON user_ai_agents(user_id) 
WHERE is_default = TRUE;

-- ============================================================================
-- 4. TABLA: HISTORIAL DE PROMPTS POR AGENTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_agent_prompts (
    id VARCHAR(30) PRIMARY KEY,
    agent_id VARCHAR(30) NOT NULL REFERENCES user_ai_agents(id) ON DELETE CASCADE,
    
    -- Prompt dinámico
    system_prompt TEXT NOT NULL,
    context_summary TEXT NOT NULL,
    business_context JSONB DEFAULT '{}',
    
    -- Evolución del prompt
    version INTEGER DEFAULT 1,
    trigger_reason VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Performance
    tokens_used INTEGER,
    response_quality DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_agent_prompts
CREATE INDEX IF NOT EXISTS idx_user_agent_prompts_agent_active 
ON user_agent_prompts(agent_id, is_active);

-- ============================================================================
-- 5. TABLA: LEADS/CLIENTES DEL USER
-- ============================================================================

-- Crear enum para estados de lead
DO $$ BEGIN
    CREATE TYPE customer_lead_status AS ENUM (
        'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 
        'NEGOTIATION', 'WON', 'LOST', 'ON_HOLD'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS customer_leads (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Información del lead/cliente
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    company VARCHAR(100),
    
    -- Segmentación específica del negocio
    customer_type VARCHAR(50),
    business_category VARCHAR(50),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Scoring y calificación
    qualification_score INTEGER DEFAULT 0,
    lead_status customer_lead_status DEFAULT 'NEW',
    lead_grade VARCHAR(1) DEFAULT 'C',
    
    -- Información específica del negocio
    last_purchase TIMESTAMP WITH TIME ZONE,
    total_spent DECIMAL(12,2) DEFAULT 0,
    preferences JSONB,
    
    -- Seguimiento
    source VARCHAR(50),
    assigned_to VARCHAR(100),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_follow_up TIMESTAMP WITH TIME ZONE,
    
    -- Notas internas
    internal_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para customer_leads
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_leads_unique_phone 
ON customer_leads(user_id, phone);

CREATE INDEX IF NOT EXISTS idx_customer_leads_user_status 
ON customer_leads(user_id, lead_status);

CREATE INDEX IF NOT EXISTS idx_customer_leads_user_activity 
ON customer_leads(user_id, last_activity);

-- ============================================================================
-- 6. TABLA: CONVERSACIONES CRM DEL USER
-- ============================================================================

-- Crear enums para conversaciones
DO $$ BEGIN
    CREATE TYPE conversation_status AS ENUM (
        'ACTIVE', 'PAUSED', 'WAITING', 'COMPLETED', 'ARCHIVED', 'TRANSFERRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE conversation_priority AS ENUM (
        'LOW', 'NORMAL', 'HIGH', 'URGENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS crm_conversations (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_lead_id VARCHAR(30) NOT NULL REFERENCES customer_leads(id) ON DELETE CASCADE,
    whatsapp_number_id VARCHAR(30) NOT NULL REFERENCES user_whatsapp_numbers(id),
    
    -- Identificación de la conversación
    session_id VARCHAR(100) UNIQUE NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Estado de la conversación
    status conversation_status DEFAULT 'ACTIVE',
    current_step VARCHAR(50) DEFAULT 'greeting',
    priority conversation_priority DEFAULT 'NORMAL',
    
    -- IA y agente asignado
    current_agent_id VARCHAR(30) REFERENCES user_ai_agents(id),
    agent_name VARCHAR(100),
    
    -- Contenido de la conversación
    messages JSONB DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    
    -- Seguimiento y métricas
    first_response_time INTEGER,
    avg_response_time DECIMAL(8,2),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Gestión humana
    requires_attention BOOLEAN DEFAULT FALSE,
    assigned_to_user VARCHAR(100),
    handoff_reason VARCHAR(200),
    handoff_at TIMESTAMP WITH TIME ZONE,
    
    -- Tags y categorización
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    category VARCHAR(50),
    intent VARCHAR(50),
    
    -- Satisfacción y resultado
    satisfaction_rating INTEGER,
    outcome VARCHAR(50),
    conversion_value DECIMAL(12,2) DEFAULT 0,
    
    -- Notas internas
    internal_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para crm_conversations
CREATE INDEX IF NOT EXISTS idx_crm_conversations_user_status 
ON crm_conversations(user_id, status);

CREATE INDEX IF NOT EXISTS idx_crm_conversations_customer_lead 
ON crm_conversations(customer_lead_id);

CREATE INDEX IF NOT EXISTS idx_crm_conversations_whatsapp_created 
ON crm_conversations(whatsapp_number_id, created_at);

CREATE INDEX IF NOT EXISTS idx_crm_conversations_last_message 
ON crm_conversations(last_message_at);

-- ============================================================================
-- 7. TABLA: TAGS PERSONALIZADOS POR USER
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_tags (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6',
    description TEXT,
    category VARCHAR(50),
    
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para crm_tags
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_tags_unique_name 
ON crm_tags(user_id, name);

CREATE INDEX IF NOT EXISTS idx_crm_tags_user_category 
ON crm_tags(user_id, category);

-- ============================================================================
-- 8. TABLA: MÉTRICAS AGREGADAS POR USER
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_metrics (
    id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(30) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Período de la métrica
    period VARCHAR(20) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Métricas de conversaciones
    total_conversations INTEGER DEFAULT 0,
    active_conversations INTEGER DEFAULT 0,
    new_conversations INTEGER DEFAULT 0,
    completed_conversations INTEGER DEFAULT 0,
    
    -- Métricas de leads
    total_leads INTEGER DEFAULT 0,
    new_leads INTEGER DEFAULT 0,
    qualified_leads INTEGER DEFAULT 0,
    converted_leads INTEGER DEFAULT 0,
    
    -- Métricas de agentes
    total_messages INTEGER DEFAULT 0,
    ai_messages INTEGER DEFAULT 0,
    human_messages INTEGER DEFAULT 0,
    avg_response_time DECIMAL(8,2) DEFAULT 0,
    
    -- Métricas de negocio
    total_revenue DECIMAL(12,2) DEFAULT 0,
    avg_conversion_value DECIMAL(12,2) DEFAULT 0,
    satisfaction_avg DECIMAL(3,2) DEFAULT 0,
    
    -- Costos
    total_tokens_used INTEGER DEFAULT 0,
    estimated_ai_cost DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para crm_metrics
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_metrics_unique_period 
ON crm_metrics(user_id, period, period_start);

CREATE INDEX IF NOT EXISTS idx_crm_metrics_user_period 
ON crm_metrics(user_id, period);

-- ============================================================================
-- 9. FOREIGN KEYS ADICIONALES
-- ============================================================================

-- FK de user_whatsapp_numbers.default_agent_id
ALTER TABLE user_whatsapp_numbers 
ADD CONSTRAINT fk_whatsapp_default_agent 
FOREIGN KEY (default_agent_id) REFERENCES user_ai_agents(id);

-- ============================================================================
-- 10. TRIGGERS PARA UPDATED_AT
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para todas las tablas CRM
CREATE TRIGGER update_user_whatsapp_numbers_updated_at 
    BEFORE UPDATE ON user_whatsapp_numbers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ai_agents_updated_at 
    BEFORE UPDATE ON user_ai_agents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_agent_prompts_updated_at 
    BEFORE UPDATE ON user_agent_prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_leads_updated_at 
    BEFORE UPDATE ON customer_leads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_conversations_updated_at 
    BEFORE UPDATE ON crm_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_tags_updated_at 
    BEFORE UPDATE ON crm_tags 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_metrics_updated_at 
    BEFORE UPDATE ON crm_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 11. COMENTARIOS EN TABLAS
-- ============================================================================

COMMENT ON TABLE user_whatsapp_numbers IS 'Números WhatsApp que cada User usa para comunicarse con SUS clientes';
COMMENT ON TABLE user_ai_agents IS 'Agentes IA personalizables por cada User para SU negocio específico';
COMMENT ON TABLE customer_leads IS 'Clientes/leads de cada User (NO los leads de SafeNotify)';
COMMENT ON TABLE crm_conversations IS 'Conversaciones entre Users y SUS clientes via WhatsApp';

-- ============================================================================
-- ✅ MIGRACIÓN COMPLETADA
-- ============================================================================

-- Insertar registro de migración
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('001_add_crm_tables', NOW())
ON CONFLICT (version) DO NOTHING;