CREATE TABLE "commentary_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse_start" integer,
	"verse_end" integer,
	"title" text,
	"body_html" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cross_references" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"from_book" integer NOT NULL,
	"from_chapter" integer NOT NULL,
	"from_verse" integer NOT NULL,
	"to_book" integer NOT NULL,
	"to_chapter" integer NOT NULL,
	"to_verse" integer NOT NULL,
	"to_verse_end" integer NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" text,
	"kind" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"source_file" text NOT NULL,
	"source_format" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"message" text,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_by" uuid,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lexicon_entries" (
	"resource_id" text NOT NULL,
	"strong" text NOT NULL,
	"language" text NOT NULL,
	"lemma" text NOT NULL,
	"transliteration" text,
	"pronunciation" text,
	"definition_html" text,
	"derivation_html" text,
	"kjv_definition_html" text,
	"see_also" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "lexicon_entries_resource_id_strong_pk" PRIMARY KEY("resource_id","strong")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_books" (
	"resource_id" text NOT NULL,
	"book_id" integer NOT NULL,
	"chapter_count" integer NOT NULL,
	"verse_count" integer NOT NULL,
	CONSTRAINT "resource_books_resource_id_book_id_pk" PRIMARY KEY("resource_id","book_id"),
	CONSTRAINT "resource_books_book_id_check" CHECK ("resource_books"."book_id" between 1 and 66)
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"abbrev" text NOT NULL,
	"language" text NOT NULL,
	"canon" text DEFAULT 'both' NOT NULL,
	"direction" text DEFAULT 'ltr' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"has_strongs" boolean DEFAULT false NOT NULL,
	"has_morphology" boolean DEFAULT false NOT NULL,
	"license_html" text,
	"source_format" text,
	"source_file" text,
	"verse_count" integer DEFAULT 0 NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_sort_order_check" CHECK ("resources"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"display_name" text,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verse_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"note_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verse_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"intro_html" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verse_words" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"verse_id" bigint NOT NULL,
	"book_id" integer NOT NULL,
	"position" integer NOT NULL,
	"word" text NOT NULL,
	"strong" text NOT NULL,
	"morph" text,
	"lemma" text,
	"translit" text
);
--> statement-breakpoint
CREATE TABLE "verses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"resource_id" text NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"verse_end" integer,
	"segments" jsonb NOT NULL,
	"text" text NOT NULL,
	"heading" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('german_unaccent', text)) STORED,
	CONSTRAINT "verses_book_id_check" CHECK ("verses"."book_id" between 1 and 66),
	CONSTRAINT "verses_chapter_check" CHECK ("verses"."chapter" between 1 and 200),
	CONSTRAINT "verses_verse_check" CHECK ("verses"."verse" between 1 and 250)
);
--> statement-breakpoint
ALTER TABLE "commentary_entries" ADD CONSTRAINT "commentary_entries_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_references" ADD CONSTRAINT "cross_references_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lexicon_entries" ADD CONSTRAINT "lexicon_entries_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_books" ADD CONSTRAINT "resource_books_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_list_items" ADD CONSTRAINT "verse_list_items_list_id_verse_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."verse_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_lists" ADD CONSTRAINT "verse_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_words" ADD CONSTRAINT "verse_words_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_words" ADD CONSTRAINT "verse_words_verse_id_verses_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."verses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verses" ADD CONSTRAINT "verses_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commentary_entries_ref_idx" ON "commentary_entries" USING btree ("resource_id","book_id","chapter","verse_start");--> statement-breakpoint
CREATE INDEX "cross_references_from_idx" ON "cross_references" USING btree ("resource_id","from_book","from_chapter","from_verse");--> statement-breakpoint
CREATE INDEX "import_jobs_state_idx" ON "import_jobs" USING btree ("state","created_at");--> statement-breakpoint
CREATE INDEX "lexicon_entries_strong_idx" ON "lexicon_entries" USING btree ("strong");--> statement-breakpoint
CREATE INDEX "login_attempts_subject_idx" ON "login_attempts" USING btree ("subject","attempted_at");--> statement-breakpoint
CREATE INDEX "password_resets_user_idx" ON "password_resets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resources_kind_public_idx" ON "resources" USING btree ("kind","is_public","sort_order");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verse_list_items_list_idx" ON "verse_list_items" USING btree ("list_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "verse_list_items_verse_idx" ON "verse_list_items" USING btree ("list_id","book_id","chapter","verse");--> statement-breakpoint
CREATE INDEX "verse_lists_user_idx" ON "verse_lists" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "verse_lists_slug_idx" ON "verse_lists" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "verse_words_strong_idx" ON "verse_words" USING btree ("resource_id","strong");--> statement-breakpoint
CREATE INDEX "verse_words_verse_idx" ON "verse_words" USING btree ("verse_id","position");--> statement-breakpoint
CREATE INDEX "verse_words_lookup_idx" ON "verse_words" USING btree ("strong","book_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verses_ref_idx" ON "verses" USING btree ("resource_id","book_id","chapter","verse");--> statement-breakpoint
CREATE INDEX "verses_search_idx" ON "verses" USING gin ("search_vector");