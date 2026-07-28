CREATE TABLE "chapter_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"note_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_notes_book_id_check" CHECK ("chapter_notes"."book_id" between 1 and 66),
	CONSTRAINT "chapter_notes_chapter_check" CHECK ("chapter_notes"."chapter" between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "chapter_notes" ADD CONSTRAINT "chapter_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_notes_reference_idx" ON "chapter_notes" USING btree ("user_id","book_id","chapter");--> statement-breakpoint
CREATE INDEX "chapter_notes_user_idx" ON "chapter_notes" USING btree ("user_id","updated_at");