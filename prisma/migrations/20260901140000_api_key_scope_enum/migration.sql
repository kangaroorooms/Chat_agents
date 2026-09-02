CREATE TYPE "CompanyApiKeyScope" AS ENUM ('READ', 'WRITE', 'ADMIN');
ALTER TABLE "CompanyApiKey" ADD COLUMN "scopes_new" "CompanyApiKeyScope"[] NOT NULL DEFAULT ARRAY[]::"CompanyApiKeyScope"[];
UPDATE "CompanyApiKey" SET "scopes_new" = ARRAY(SELECT value::"CompanyApiKeyScope" FROM unnest("scopes") AS value);
ALTER TABLE "CompanyApiKey" DROP COLUMN "scopes";
ALTER TABLE "CompanyApiKey" RENAME COLUMN "scopes_new" TO "scopes";
