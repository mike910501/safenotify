-- CreateTable
CREATE TABLE "public"."mcp_configurations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcpEnabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'openai_functions',
    "sendMultimedia" BOOLEAN NOT NULL DEFAULT true,
    "saveData" BOOLEAN NOT NULL DEFAULT true,
    "analyzeIntent" BOOLEAN NOT NULL DEFAULT true,
    "scheduleFollowUp" BOOLEAN NOT NULL DEFAULT true,
    "maxFunctionCalls" INTEGER NOT NULL DEFAULT 5,
    "functionTimeout" INTEGER NOT NULL DEFAULT 30000,
    "retryOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_configurations_userId_key" ON "public"."mcp_configurations"("userId");

-- CreateIndex
CREATE INDEX "mcp_configurations_userId_idx" ON "public"."mcp_configurations"("userId");

-- AddForeignKey
ALTER TABLE "public"."mcp_configurations" ADD CONSTRAINT "mcp_configurations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
