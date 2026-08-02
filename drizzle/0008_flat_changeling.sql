CREATE TABLE "api_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "api_requests_subject_idx" ON "api_requests" USING btree ("subject","requested_at");