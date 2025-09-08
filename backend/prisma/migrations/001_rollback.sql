-- ============================================================================
-- 🔄 ROLLBACK SCRIPT: CRM Tables Migration
-- Versión: 001 - Rollback CRM Tables Creation
-- Fecha: 2024-01-01  
-- CUIDADO: Este script ELIMINA todas las tablas CRM y datos relacionados
-- ============================================================================

-- ⚠️ ADVERTENCIA: BACKUP RECOMENDADO ANTES DE EJECUTAR
-- Este rollback eliminará TODOS los datos CRM de Users

-- ============================================================================
-- 1. ELIMINAR TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_user_whatsapp_numbers_updated_at ON user_whatsapp_numbers;
DROP TRIGGER IF EXISTS update_user_ai_agents_updated_at ON user_ai_agents;
DROP TRIGGER IF EXISTS update_user_agent_prompts_updated_at ON user_agent_prompts;
DROP TRIGGER IF EXISTS update_customer_leads_updated_at ON customer_leads;
DROP TRIGGER IF EXISTS update_crm_conversations_updated_at ON crm_conversations;
DROP TRIGGER IF EXISTS update_crm_tags_updated_at ON crm_tags;
DROP TRIGGER IF EXISTS update_crm_metrics_updated_at ON crm_metrics;

-- ============================================================================
-- 2. ELIMINAR FOREIGN KEYS
-- ============================================================================

ALTER TABLE user_whatsapp_numbers DROP CONSTRAINT IF EXISTS fk_whatsapp_default_agent;

-- ============================================================================
-- 3. ELIMINAR TABLAS CRM (En orden inverso debido a FKs)
-- ============================================================================

-- Eliminar tabla de métricas
DROP TABLE IF EXISTS crm_metrics CASCADE;

-- Eliminar tabla de tags
DROP TABLE IF EXISTS crm_tags CASCADE;

-- Eliminar tabla de conversaciones CRM
DROP TABLE IF EXISTS crm_conversations CASCADE;

-- Eliminar tabla de leads de clientes
DROP TABLE IF EXISTS customer_leads CASCADE;

-- Eliminar tabla de historial de prompts
DROP TABLE IF EXISTS user_agent_prompts CASCADE;

-- Eliminar tabla de agentes IA
DROP TABLE IF EXISTS user_ai_agents CASCADE;

-- Eliminar tabla de números WhatsApp
DROP TABLE IF EXISTS user_whatsapp_numbers CASCADE;

-- ============================================================================
-- 4. ELIMINAR ENUMS
-- ============================================================================

DROP TYPE IF EXISTS customer_lead_status CASCADE;
DROP TYPE IF EXISTS conversation_status CASCADE;
DROP TYPE IF EXISTS conversation_priority CASCADE;

-- ============================================================================
-- 5. ELIMINAR CAMPOS AGREGADOS A TABLA USERS
-- ============================================================================

-- Eliminar campos CRM de users
ALTER TABLE users DROP COLUMN IF EXISTS crm_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS crm_plan;
ALTER TABLE users DROP COLUMN IF EXISTS max_agents;
ALTER TABLE users DROP COLUMN IF EXISTS max_whatsapp_numbers;

-- ============================================================================
-- 6. ELIMINAR ÍNDICES AGREGADOS
-- ============================================================================

DROP INDEX IF EXISTS idx_users_crm_enabled;
DROP INDEX IF EXISTS idx_users_crm_plan;

-- ============================================================================
-- 7. ELIMINAR FUNCIÓN DE TRIGGERS
-- ============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- 8. ELIMINAR ENTRADA DE MIGRACIÓN
-- ============================================================================

DELETE FROM schema_migrations WHERE version = '001_add_crm_tables';

-- ============================================================================
-- ✅ ROLLBACK COMPLETADO
-- ============================================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '🔄 ROLLBACK COMPLETADO: Todas las tablas CRM han sido eliminadas';
    RAISE NOTICE '⚠️  ADVERTENCIA: Todos los datos CRM de Users se han perdido';
    RAISE NOTICE '📊 Estado: Base de datos restaurada al estado pre-CRM';
END
$$;