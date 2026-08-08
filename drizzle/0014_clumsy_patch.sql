CREATE TABLE "verse_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"resource_id" text NOT NULL,
	"comment_html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verse_comments_book_id_check" CHECK ("verse_comments"."book_id" between 1 and 66),
	CONSTRAINT "verse_comments_chapter_check" CHECK ("verse_comments"."chapter" between 1 and 200),
	CONSTRAINT "verse_comments_verse_check" CHECK ("verse_comments"."verse" between 1 and 250)
);
--> statement-breakpoint
DROP TABLE "chapter_notes" CASCADE;--> statement-breakpoint
ALTER TABLE "verse_comments" ADD CONSTRAINT "verse_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_comments" ADD CONSTRAINT "verse_comments_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "verse_comments_reference_idx" ON "verse_comments" USING btree ("user_id","resource_id","book_id","chapter","verse");--> statement-breakpoint
CREATE INDEX "verse_comments_user_idx" ON "verse_comments" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "verse_comments_chapter_idx" ON "verse_comments" USING btree ("user_id","book_id","chapter","resource_id");