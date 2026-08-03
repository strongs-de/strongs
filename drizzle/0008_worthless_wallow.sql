CREATE TABLE "verse_highlights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"style_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "verse_highlights" ADD CONSTRAINT "verse_highlights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_highlights" ADD CONSTRAINT "verse_highlights_style_id_highlight_styles_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."highlight_styles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "verse_highlights_verse_idx" ON "verse_highlights" USING btree ("user_id","book_id","chapter","verse");--> statement-breakpoint
CREATE INDEX "verse_highlights_style_idx" ON "verse_highlights" USING btree ("style_id");