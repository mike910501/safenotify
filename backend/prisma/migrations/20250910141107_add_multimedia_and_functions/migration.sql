/*
  Warnings:

  - You are about to drop the `whatsapp_campaigns` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `whatsapp_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `whatsapp_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."SafeNotifyLeadStatus" AS ENUM ('new', 'qualified', 'demo_scheduled', 'demo_completed', 'converted', 'lost', 'nurturing');

-- CreateEnum
CREATE TYPE "public"."ClientFunnelLeadStatus" AS ENUM ('new', 'qualified', 'interested', 'appointment_scheduled', 'appointment_completed', 'converted', 'lost', 'nurturing');

-- CreateEnum
CREATE TYPE "public"."CustomerLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'WAITING', 'COMPLETED', 'ARCHIVED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "public"."ConversationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- DropForeignKey
ALTER TABLE "public"."whatsapp_campaigns" DROP CONSTRAINT "whatsapp_campaigns_templateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."whatsapp_campaigns" DROP CONSTRAINT "whatsapp_campaigns_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."whatsapp_messages" DROP CONSTRAINT "whatsapp_messages_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."whatsapp_templates" DROP CONSTRAINT "whatsapp_templates_createdBy_fkey";

-- AlterTable
ALTER TABLE "public"."templates" ADD COLUMN     "businessCategory" TEXT NOT NULL DEFAULT 'UTILITY',
ADD COLUMN     "buttonsConfig" JSONB,
ADD COLUMN     "footerText" TEXT,
ADD COLUMN     "hasInteractiveButtons" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "headerText" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "templateType" TEXT NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "twilioContentSid" TEXT,
ADD COLUMN     "variablesMapping" JSONB;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "crmEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "crmPlan" TEXT NOT NULL DEFAULT 'basic',
ADD COLUMN     "maxAgents" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxWhatsAppNumbers" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "public"."whatsapp_campaigns";

-- DropTable
DROP TABLE "public"."whatsapp_messages";

-- DropTable
DROP TABLE "public"."whatsapp_templates";

-- CreateTable
CREATE TABLE "public"."safenotify_leads" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "clinicName" TEXT,
    "specialty" TEXT,
    "industry" TEXT,
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "monthlyPatients" INTEGER,
    "currentSystem" TEXT,
    "whatsappUsage" TEXT,
    "complianceAwareness" BOOLEAN NOT NULL DEFAULT false,
    "qualificationScore" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."SafeNotifyLeadStatus" NOT NULL DEFAULT 'new',
    "grade" TEXT NOT NULL DEFAULT 'C',
    "conversationState" TEXT NOT NULL DEFAULT 'initial',
    "lastIntent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companySize" TEXT,
    "budget" TEXT,
    "timeline" TEXT,
    "authority" TEXT,
    "currentSolution" TEXT,
    "painPoints" TEXT[],
    "biggestPainPoint" TEXT,
    "noShowRate" TEXT,
    "staffSize" TEXT,
    "demoScheduledAt" TIMESTAMP(3),
    "demoCompleted" BOOLEAN NOT NULL DEFAULT false,
    "conversionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safenotify_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."safenotify_conversations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messages" JSONB[],
    "intent" TEXT,
    "currentStep" TEXT NOT NULL DEFAULT 'greeting',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "personality" TEXT NOT NULL DEFAULT 'sofia',
    "objectionsHandled" TEXT[],
    "contentSent" TEXT[],
    "roiCalculated" BOOLEAN NOT NULL DEFAULT false,
    "handedOff" BOOLEAN NOT NULL DEFAULT false,
    "handoffReason" TEXT,
    "handoffTime" TIMESTAMP(3),
    "salesRepAssigned" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "responseTime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safenotify_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation_prompts" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "conversationId" TEXT,
    "currentPrompt" TEXT NOT NULL,
    "conversationSummary" TEXT NOT NULL,
    "businessContext" JSONB NOT NULL,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "lastMessageCount" INTEGER NOT NULL DEFAULT 0,
    "triggerReason" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "responseQuality" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."safenotify_demos" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "demoType" TEXT NOT NULL DEFAULT 'full',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "zoomLink" TEXT,
    "meetingId" TEXT,
    "calendarLink" TEXT,
    "salesRepEmail" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "followupSent" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "conversionProbability" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safenotify_demos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."safenotify_content" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" INTEGER,
    "specialty" TEXT[],
    "conversationStage" TEXT[],
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "effectivenessScore" DOUBLE PRECISION,
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "originalContentId" TEXT,
    "variantName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safenotify_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."client_funnels" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "funnelName" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "serviceDescription" TEXT,
    "targetAudience" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "monthlyGoal" INTEGER,
    "servicePrice" DOUBLE PRECISION,
    "whatsappNumber" TEXT,
    "startCode" TEXT,
    "calendarIntegration" JSONB,
    "paymentIntegration" JSONB,
    "aiPersonalityConfig" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."funnel_content" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "orderInStage" INTEGER NOT NULL DEFAULT 0,
    "isVariant" BOOLEAN NOT NULL DEFAULT false,
    "variantName" TEXT,
    "engagementMetrics" JSONB,
    "conversionImpact" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."funnel_configurations" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "personalityName" TEXT NOT NULL DEFAULT 'assistant',
    "specialtyContext" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "language" TEXT NOT NULL DEFAULT 'es',
    "qualifyingQuestions" JSONB NOT NULL,
    "scoringRules" JSONB NOT NULL,
    "objectionResponses" JSONB NOT NULL,
    "automationConfig" JSONB,
    "followUpSequence" JSONB,
    "integrationSettings" JSONB,
    "autoHandoffScore" INTEGER NOT NULL DEFAULT 80,
    "businessHours" JSONB,
    "maxFollowUps" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."client_funnel_leads" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "qualificationData" JSONB,
    "qualificationScore" INTEGER NOT NULL DEFAULT 0,
    "grade" TEXT NOT NULL DEFAULT 'C',
    "status" "public"."ClientFunnelLeadStatus" NOT NULL DEFAULT 'new',
    "currentStage" TEXT NOT NULL DEFAULT 'initial',
    "conversationState" TEXT NOT NULL DEFAULT 'greeting',
    "contentConsumed" JSONB,
    "objectionsRaised" JSONB,
    "conversionProbability" INTEGER,
    "estimatedValue" DOUBLE PRECISION,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointmentScheduled" BOOLEAN NOT NULL DEFAULT false,
    "appointmentDate" TIMESTAMP(3),
    "appointmentCompleted" BOOLEAN NOT NULL DEFAULT false,
    "conversionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_funnel_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."funnel_conversations" (
    "id" TEXT NOT NULL,
    "funnelLeadId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messages" JSONB[],
    "currentAiContext" JSONB,
    "personalityUsed" TEXT NOT NULL,
    "intent" TEXT,
    "currentStep" TEXT NOT NULL DEFAULT 'greeting',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "automationTriggered" JSONB,
    "contentDelivered" TEXT[],
    "handoffStatus" TEXT NOT NULL DEFAULT 'none',
    "handoffReason" TEXT,
    "handoffTime" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "averageResponseTime" DOUBLE PRECISION,
    "engagementScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funnel_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."funnel_analytics" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "averageEngagementTime" DOUBLE PRECISION,
    "contentEngagement" JSONB,
    "stageConversionRates" JSONB,
    "costPerLead" DOUBLE PRECISION,
    "costPerConversion" DOUBLE PRECISION,
    "returnOnInvestment" DOUBLE PRECISION,
    "topPerformingContent" JSONB,
    "commonDropOffPoints" JSONB,
    "optimizationSuggestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funnel_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_settings" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 500,
    "sofiaPersonality" JSONB,
    "salesPhoneNumber" TEXT,
    "businessHours" JSONB,
    "globalRateLimit" INTEGER NOT NULL DEFAULT 60,
    "defaultGreeting" TEXT NOT NULL DEFAULT '¡Hola! ¿En qué puedo ayudarte hoy?',
    "handoffMessage" TEXT NOT NULL DEFAULT 'Te voy a conectar con uno de nuestros especialistas.',
    "autoOptimization" BOOLEAN NOT NULL DEFAULT true,
    "abTestingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "analyticsRetention" INTEGER NOT NULL DEFAULT 365,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gpt_usage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "phone" TEXT NOT NULL,
    "conversationId" TEXT,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "reasoningEffort" TEXT,
    "verbosity" TEXT,
    "userConfigured" BOOLEAN DEFAULT false,
    "intent" TEXT,
    "leadScore" INTEGER,
    "responseType" TEXT NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "leadValueBefore" INTEGER,
    "leadValueAfter" INTEGER,
    "conversionEvent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gpt_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_whatsapp_numbers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "twilioSid" TEXT,
    "businessHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "defaultAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_whatsapp_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_ai_agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "personalityPrompt" TEXT NOT NULL,
    "businessPrompt" TEXT NOT NULL,
    "objectivesPrompt" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-5-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokensPerMessage" INTEGER NOT NULL DEFAULT 500,
    "reasoningEffort" TEXT DEFAULT 'medium',
    "verbosity" TEXT DEFAULT 'medium',
    "responseStyle" JSONB,
    "businessRules" JSONB,
    "triggerKeywords" TEXT[],
    "activeHours" JSONB,
    "weekdaysOnly" BOOLEAN NOT NULL DEFAULT false,
    "useFunctionCalling" BOOLEAN NOT NULL DEFAULT false,
    "mcpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mcpProvider" TEXT,
    "enabledFunctions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_agent_prompts" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "contextSummary" TEXT,
    "businessContext" JSONB,
    "version" INTEGER NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_agent_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_leads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "public"."CustomerLeadStatus" NOT NULL DEFAULT 'NEW',
    "qualificationScore" INTEGER NOT NULL DEFAULT 0,
    "businessType" TEXT,
    "companyName" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "firstContact" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUp" TIMESTAMP(3),
    "customFields" JSONB,
    "tags" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crm_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerLeadId" TEXT NOT NULL,
    "whatsappNumberId" TEXT,
    "sessionId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStep" TEXT NOT NULL DEFAULT 'greeting',
    "priority" "public"."ConversationPriority" NOT NULL DEFAULT 'NORMAL',
    "currentAgentId" TEXT,
    "agentName" TEXT,
    "messages" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assignedToUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "lastHumanResponse" TIMESTAMP(3),
    "humanTakeover" BOOLEAN NOT NULL DEFAULT false,
    "takingOverUserId" TEXT,
    "takeoverAt" TIMESTAMP(3),
    "takeoverReason" TEXT,
    "aiSuggestions" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "lastAiSuggestion" TIMESTAMP(3),
    "collaborationMode" TEXT NOT NULL DEFAULT 'ai_only',
    "takeoverRequested" BOOLEAN NOT NULL DEFAULT false,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "firstMessage" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3),
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversation_takeover_logs" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromMode" TEXT NOT NULL,
    "toMode" TEXT NOT NULL,
    "reason" TEXT,
    "customerMessage" TEXT,
    "agentResponse" TEXT,
    "aiSuggestion" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_takeover_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crm_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedId" TEXT,
    "relatedType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crm_feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "aiHelpfulness" INTEGER,
    "suggestionQuality" INTEGER,
    "handoffSmoothness" INTEGER,
    "overallSatisfaction" INTEGER,
    "relevance" INTEGER,
    "actionability" INTEGER,
    "suggestionUsed" BOOLEAN,
    "wouldUseSuggestionsAgain" BOOLEAN,
    "takeoverWasNecessary" BOOLEAN,
    "aiCouldHaveHandledAlone" BOOLEAN,
    "comments" TEXT,
    "improvementSuggestions" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."crm_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "totalLeads" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION,
    "avgConversationDuration" DOUBLE PRECISION,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDealSize" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "agentUtilization" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."media_files" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "originalUrl" TEXT NOT NULL,
    "cloudinaryUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "purpose" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "aiAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."business_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "conversationId" TEXT,
    "recordType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "safenotify_leads_phone_key" ON "public"."safenotify_leads"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "safenotify_conversations_sessionId_key" ON "public"."safenotify_conversations"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_configurations_funnelId_key" ON "public"."funnel_configurations"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "client_funnel_leads_funnelId_phone_key" ON "public"."client_funnel_leads"("funnelId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_conversations_sessionId_key" ON "public"."funnel_conversations"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "funnel_analytics_funnelId_date_key" ON "public"."funnel_analytics"("funnelId", "date");

-- CreateIndex
CREATE INDEX "gpt_usage_phone_idx" ON "public"."gpt_usage"("phone");

-- CreateIndex
CREATE INDEX "gpt_usage_model_idx" ON "public"."gpt_usage"("model");

-- CreateIndex
CREATE INDEX "gpt_usage_createdAt_idx" ON "public"."gpt_usage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_whatsapp_numbers_phoneNumber_key" ON "public"."user_whatsapp_numbers"("phoneNumber");

-- CreateIndex
CREATE INDEX "user_whatsapp_numbers_userId_idx" ON "public"."user_whatsapp_numbers"("userId");

-- CreateIndex
CREATE INDEX "user_whatsapp_numbers_phoneNumber_idx" ON "public"."user_whatsapp_numbers"("phoneNumber");

-- CreateIndex
CREATE INDEX "user_ai_agents_userId_idx" ON "public"."user_ai_agents"("userId");

-- CreateIndex
CREATE INDEX "user_ai_agents_userId_isActive_idx" ON "public"."user_ai_agents"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_ai_agents_userId_name_isActive_key" ON "public"."user_ai_agents"("userId", "name", "isActive");

-- CreateIndex
CREATE INDEX "user_agent_prompts_agentId_idx" ON "public"."user_agent_prompts"("agentId");

-- CreateIndex
CREATE INDEX "user_agent_prompts_agentId_isActive_idx" ON "public"."user_agent_prompts"("agentId", "isActive");

-- CreateIndex
CREATE INDEX "user_agent_prompts_agentId_version_idx" ON "public"."user_agent_prompts"("agentId", "version");

-- CreateIndex
CREATE INDEX "customer_leads_userId_idx" ON "public"."customer_leads"("userId");

-- CreateIndex
CREATE INDEX "customer_leads_userId_phone_idx" ON "public"."customer_leads"("userId", "phone");

-- CreateIndex
CREATE INDEX "customer_leads_userId_status_idx" ON "public"."customer_leads"("userId", "status");

-- CreateIndex
CREATE INDEX "customer_leads_qualificationScore_idx" ON "public"."customer_leads"("qualificationScore");

-- CreateIndex
CREATE UNIQUE INDEX "crm_conversations_sessionId_key" ON "public"."crm_conversations"("sessionId");

-- CreateIndex
CREATE INDEX "crm_conversations_userId_idx" ON "public"."crm_conversations"("userId");

-- CreateIndex
CREATE INDEX "crm_conversations_userId_status_idx" ON "public"."crm_conversations"("userId", "status");

-- CreateIndex
CREATE INDEX "crm_conversations_customerLeadId_idx" ON "public"."crm_conversations"("customerLeadId");

-- CreateIndex
CREATE INDEX "crm_conversations_currentAgentId_idx" ON "public"."crm_conversations"("currentAgentId");

-- CreateIndex
CREATE INDEX "crm_conversations_sessionId_idx" ON "public"."crm_conversations"("sessionId");

-- CreateIndex
CREATE INDEX "crm_conversations_lastActivity_idx" ON "public"."crm_conversations"("lastActivity");

-- CreateIndex
CREATE INDEX "conversation_takeover_logs_conversationId_idx" ON "public"."conversation_takeover_logs"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_takeover_logs_userId_idx" ON "public"."conversation_takeover_logs"("userId");

-- CreateIndex
CREATE INDEX "conversation_takeover_logs_eventType_idx" ON "public"."conversation_takeover_logs"("eventType");

-- CreateIndex
CREATE INDEX "crm_notifications_userId_idx" ON "public"."crm_notifications"("userId");

-- CreateIndex
CREATE INDEX "crm_notifications_userId_isRead_idx" ON "public"."crm_notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "crm_notifications_type_idx" ON "public"."crm_notifications"("type");

-- CreateIndex
CREATE INDEX "crm_notifications_priority_idx" ON "public"."crm_notifications"("priority");

-- CreateIndex
CREATE INDEX "crm_feedback_userId_idx" ON "public"."crm_feedback"("userId");

-- CreateIndex
CREATE INDEX "crm_feedback_conversationId_idx" ON "public"."crm_feedback"("conversationId");

-- CreateIndex
CREATE INDEX "crm_feedback_feedbackType_idx" ON "public"."crm_feedback"("feedbackType");

-- CreateIndex
CREATE INDEX "crm_feedback_overallSatisfaction_idx" ON "public"."crm_feedback"("overallSatisfaction");

-- CreateIndex
CREATE INDEX "crm_metrics_userId_idx" ON "public"."crm_metrics"("userId");

-- CreateIndex
CREATE INDEX "crm_metrics_userId_period_idx" ON "public"."crm_metrics"("userId", "period");

-- CreateIndex
CREATE INDEX "crm_metrics_periodStart_periodEnd_idx" ON "public"."crm_metrics"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "crm_metrics_userId_period_periodStart_key" ON "public"."crm_metrics"("userId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "media_files_conversationId_idx" ON "public"."media_files"("conversationId");

-- CreateIndex
CREATE INDEX "media_files_userId_idx" ON "public"."media_files"("userId");

-- CreateIndex
CREATE INDEX "media_files_agentId_idx" ON "public"."media_files"("agentId");

-- CreateIndex
CREATE INDEX "media_files_purpose_idx" ON "public"."media_files"("purpose");

-- CreateIndex
CREATE INDEX "business_records_userId_recordType_idx" ON "public"."business_records"("userId", "recordType");

-- CreateIndex
CREATE INDEX "business_records_status_idx" ON "public"."business_records"("status");

-- CreateIndex
CREATE INDEX "business_records_createdAt_idx" ON "public"."business_records"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."safenotify_conversations" ADD CONSTRAINT "safenotify_conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."safenotify_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_prompts" ADD CONSTRAINT "conversation_prompts_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."safenotify_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."safenotify_demos" ADD CONSTRAINT "safenotify_demos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."safenotify_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_funnels" ADD CONSTRAINT "client_funnels_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."funnel_content" ADD CONSTRAINT "funnel_content_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."client_funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."funnel_configurations" ADD CONSTRAINT "funnel_configurations_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."client_funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."client_funnel_leads" ADD CONSTRAINT "client_funnel_leads_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."client_funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."funnel_conversations" ADD CONSTRAINT "funnel_conversations_funnelLeadId_fkey" FOREIGN KEY ("funnelLeadId") REFERENCES "public"."client_funnel_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."funnel_analytics" ADD CONSTRAINT "funnel_analytics_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "public"."client_funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_whatsapp_numbers" ADD CONSTRAINT "user_whatsapp_numbers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_whatsapp_numbers" ADD CONSTRAINT "user_whatsapp_numbers_defaultAgentId_fkey" FOREIGN KEY ("defaultAgentId") REFERENCES "public"."user_ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_ai_agents" ADD CONSTRAINT "user_ai_agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_agent_prompts" ADD CONSTRAINT "user_agent_prompts_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."user_ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_leads" ADD CONSTRAINT "customer_leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_conversations" ADD CONSTRAINT "crm_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_conversations" ADD CONSTRAINT "crm_conversations_customerLeadId_fkey" FOREIGN KEY ("customerLeadId") REFERENCES "public"."customer_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_conversations" ADD CONSTRAINT "crm_conversations_currentAgentId_fkey" FOREIGN KEY ("currentAgentId") REFERENCES "public"."user_ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_conversations" ADD CONSTRAINT "crm_conversations_whatsappNumberId_fkey" FOREIGN KEY ("whatsappNumberId") REFERENCES "public"."user_whatsapp_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_conversations" ADD CONSTRAINT "crm_conversations_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_takeover_logs" ADD CONSTRAINT "conversation_takeover_logs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."conversation_takeover_logs" ADD CONSTRAINT "conversation_takeover_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_notifications" ADD CONSTRAINT "crm_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_feedback" ADD CONSTRAINT "crm_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_feedback" ADD CONSTRAINT "crm_feedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."crm_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_metrics" ADD CONSTRAINT "crm_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_files" ADD CONSTRAINT "media_files_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."crm_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_files" ADD CONSTRAINT "media_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media_files" ADD CONSTRAINT "media_files_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."user_ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_records" ADD CONSTRAINT "business_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_records" ADD CONSTRAINT "business_records_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."user_ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."business_records" ADD CONSTRAINT "business_records_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."crm_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
