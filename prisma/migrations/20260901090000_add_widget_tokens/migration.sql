CREATE TABLE "WidgetToken" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "allowedDomains" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WidgetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WidgetToken_token_key" ON "WidgetToken"("token");
CREATE INDEX "WidgetToken_companyId_idx" ON "WidgetToken"("companyId");
ALTER TABLE "WidgetToken" ADD CONSTRAINT "WidgetToken_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;