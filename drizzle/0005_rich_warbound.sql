ALTER TABLE "users" ADD COLUMN "reader_columns" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reader_font_scale" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_reader_font_scale_check" CHECK ("users"."reader_font_scale" between 85 and 140);