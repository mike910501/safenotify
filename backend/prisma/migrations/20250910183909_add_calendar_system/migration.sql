-- CreateTable
CREATE TABLE "public"."calendars" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_availability" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "calendar_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendars_userId_idx" ON "public"."calendars"("userId");

-- CreateIndex
CREATE INDEX "calendars_agentId_idx" ON "public"."calendars"("agentId");

-- CreateIndex
CREATE INDEX "calendar_events_calendarId_idx" ON "public"."calendar_events"("calendarId");

-- CreateIndex
CREATE INDEX "calendar_events_startTime_idx" ON "public"."calendar_events"("startTime");

-- CreateIndex
CREATE INDEX "calendar_events_status_idx" ON "public"."calendar_events"("status");

-- CreateIndex
CREATE INDEX "calendar_availability_calendarId_idx" ON "public"."calendar_availability"("calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_availability_calendarId_dayOfWeek_key" ON "public"."calendar_availability"("calendarId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "public"."calendars" ADD CONSTRAINT "calendars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendars" ADD CONSTRAINT "calendars_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."user_ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "public"."calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_availability" ADD CONSTRAINT "calendar_availability_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "public"."calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
