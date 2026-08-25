-- Enterprise SaaS capabilities: widget, subscriptions, audit, SLA, email, webhooks,
-- observability and API keys.
CREATE TYPE "SubscriptionPlanType" AS ENUM ('FREE', 'STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'SUSPENDED');
CREATE TYPE "AuditAction" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'COMPANY_UPDATED', 'KB_UPLOADED', 'AI_SETTINGS_CHANGED', 'CONVERSATION_ASSIGNED', 'CONVERSATION_RESOLVED', 'SUBSCRIPTION_CHANGED', 'API_KEY_CREATED', 'API_KEY_DELETED');
CREATE TYPE "EmailChannelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
CREATE TYPE "WebhookEventType" AS ENUM ('CONVERSATION_CREATED', 'CONVERSATION_ASSIGNED', 'CONVERSATION_RESOLVED', 'MESSAGE_CREATED', 'AI_REPLY_GENERATED');
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'FAILED');

ALTER TABLE "Company" ADD COLUMN "primaryColor" TEXT DEFAULT '#2563eb', ADD COLUMN "widgetWelcomeMessage" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "dueAt" TIMESTAMP(3), ADD COLUMN "breachedAt" TIMESTAMP(3), ADD COLUMN "closedAt" TIMESTAMP(3), ADD COLUMN "widgetVisitorId" TEXT;
ALTER TABLE "Message" ALTER COLUMN "senderId" DROP NOT NULL;

CREATE TABLE "WidgetVisitor" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "name" TEXT, "email" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WidgetVisitor_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "WidgetVisitor_sessionId_key" ON "WidgetVisitor"("sessionId");
CREATE INDEX "WidgetVisitor_companyId_idx" ON "WidgetVisitor"("companyId");
CREATE INDEX "WidgetVisitor_createdAt_idx" ON "WidgetVisitor"("createdAt");
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_widgetVisitorId_fkey" FOREIGN KEY ("widgetVisitorId") REFERENCES "WidgetVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Conversation_widgetVisitorId_idx" ON "Conversation"("widgetVisitorId");

CREATE TABLE "SubscriptionPlan" ("id" TEXT NOT NULL, "name" "SubscriptionPlanType" NOT NULL, "monthlyPrice" INTEGER NOT NULL, "maxAgents" INTEGER NOT NULL, "maxConversations" INTEGER NOT NULL, "maxDocuments" INTEGER NOT NULL, "aiEnabled" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");
CREATE TABLE "CompanySubscription" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "planId" TEXT NOT NULL, "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE', "currentPeriodStart" TIMESTAMP(3) NOT NULL, "currentPeriodEnd" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "CompanySubscription_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CompanySubscription_companyId_key" ON "CompanySubscription"("companyId");
CREATE INDEX "CompanySubscription_status_idx" ON "CompanySubscription"("status");
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanySubscription" ADD CONSTRAINT "CompanySubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AuditLog" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "userId" TEXT, "action" "AuditAction" NOT NULL, "resourceType" TEXT NOT NULL, "resourceId" TEXT NOT NULL, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId"); CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId"); CREATE INDEX "AuditLog_resourceType_idx" ON "AuditLog"("resourceType"); CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "SLAPolicy" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "firstResponseMinutes" INTEGER NOT NULL, "resolutionMinutes" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SLAPolicy_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "SLAPolicy_companyId_key" ON "SLAPolicy"("companyId"); ALTER TABLE "SLAPolicy" ADD CONSTRAINT "SLAPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EmailChannel" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "email" TEXT NOT NULL, "provider" TEXT NOT NULL, "apiKey" TEXT NOT NULL, "status" "EmailChannelStatus" NOT NULL DEFAULT 'ACTIVE', "lastErrorAt" TIMESTAMP(3), "lastErrorMsg" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "EmailChannel_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "EmailChannel_companyId_key" ON "EmailChannel"("companyId"); ALTER TABLE "EmailChannel" ADD CONSTRAINT "EmailChannel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "Webhook" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "url" TEXT NOT NULL, "secret" TEXT NOT NULL, "events" "WebhookEventType"[], "status" "WebhookStatus" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Webhook_companyId_idx" ON "Webhook"("companyId"); ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "WebhookDelivery" ("id" TEXT NOT NULL, "webhookId" TEXT NOT NULL, "event" "WebhookEventType" NOT NULL, "payload" JSONB NOT NULL, "statusCode" INTEGER, "responseBody" TEXT, "attempt" INTEGER NOT NULL DEFAULT 1, "nextRetryAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id"));
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId"); CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt"); ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "RequestLog" ("id" TEXT NOT NULL, "correlationId" TEXT NOT NULL, "method" TEXT NOT NULL, "path" TEXT NOT NULL, "statusCode" INTEGER NOT NULL, "responseTime" INTEGER NOT NULL, "userId" TEXT, "companyId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id"));
CREATE INDEX "RequestLog_correlationId_idx" ON "RequestLog"("correlationId"); CREATE INDEX "RequestLog_companyId_idx" ON "RequestLog"("companyId"); CREATE INDEX "RequestLog_createdAt_idx" ON "RequestLog"("createdAt");
CREATE TABLE "CompanyApiKey" ("id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "keyHash" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastUsedAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), CONSTRAINT "CompanyApiKey_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CompanyApiKey_keyHash_key" ON "CompanyApiKey"("keyHash"); CREATE INDEX "CompanyApiKey_companyId_idx" ON "CompanyApiKey"("companyId"); CREATE INDEX "CompanyApiKey_createdAt_idx" ON "CompanyApiKey"("createdAt"); ALTER TABLE "CompanyApiKey" ADD CONSTRAINT "CompanyApiKey_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
