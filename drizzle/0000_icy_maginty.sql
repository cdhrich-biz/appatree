CREATE TYPE "public"."announcement_type" AS ENUM('info', 'warning', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."relation_status" AS ENUM('pending', 'verified', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."remote_action_type" AS ENUM('navigate', 'play', 'pause', 'seek', 'search', 'bookmark_add', 'bookmark_remove', 'pref_update', 'highlight', 'speak', 'other');--> statement-breakpoint
CREATE TYPE "public"."remote_session_status" AS ENUM('requested', 'active', 'ended', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."search_source" AS ENUM('voice', 'text', 'category');--> statement-breakpoint
CREATE TYPE "public"."text_size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"type" "announcement_type" DEFAULT 'info' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_at" timestamp,
	"end_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(128) NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_id" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"channel_name" text,
	"thumbnail_url" text,
	"duration" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(100) NOT NULL,
	"icon" varchar(10) NOT NULL,
	"search_query" varchar(200) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(200) DEFAULT '새 대화' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curated_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_slug" varchar(64) NOT NULL,
	"video_id" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"channel_name" text,
	"thumbnail_url" text,
	"duration" varchar(32),
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_user_id" integer NOT NULL,
	"child_user_id" integer NOT NULL,
	"status" "relation_status" DEFAULT 'pending' NOT NULL,
	"nickname" varchar(50),
	"verified_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(6) NOT NULL,
	"parent_user_id" integer NOT NULL,
	"consumed_by" integer,
	"consumed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "listening_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_id" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"channel_name" text,
	"thumbnail_url" text,
	"duration" varchar(32),
	"progress_seconds" integer DEFAULT 0 NOT NULL,
	"total_seconds" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remote_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"actor_user_id" integer NOT NULL,
	"action_type" "remote_action_type" NOT NULL,
	"payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remote_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_key" varchar(32) NOT NULL,
	"parent_user_id" integer NOT NULL,
	"child_user_id" integer NOT NULL,
	"status" "remote_session_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"ended_at" timestamp,
	"ended_by" integer,
	"end_reason" varchar(50),
	CONSTRAINT "remote_sessions_session_key_unique" UNIQUE("session_key")
);
--> statement-breakpoint
CREATE TABLE "search_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"query" text NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"source" "search_source" DEFAULT 'text' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"text_size" text_size DEFAULT 'medium' NOT NULL,
	"volume" integer DEFAULT 70 NOT NULL,
	"tts_speed" numeric(3, 2) DEFAULT '0.90' NOT NULL,
	"autoplay" boolean DEFAULT true NOT NULL,
	"preferred_language" varchar(10) DEFAULT 'ko-KR' NOT NULL,
	"high_contrast" boolean DEFAULT false NOT NULL,
	"has_seen_onboarding" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_video_idx" ON "bookmarks" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "chat_messages_session_idx" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_idx" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "curated_category_idx" ON "curated_content" USING btree ("category_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "family_relations_pair_idx" ON "family_relations" USING btree ("parent_user_id","child_user_id");--> statement-breakpoint
CREATE INDEX "family_relations_parent_idx" ON "family_relations" USING btree ("parent_user_id");--> statement-breakpoint
CREATE INDEX "family_relations_child_idx" ON "family_relations" USING btree ("child_user_id");--> statement-breakpoint
CREATE INDEX "invite_codes_parent_idx" ON "invite_codes" USING btree ("parent_user_id");--> statement-breakpoint
CREATE INDEX "invite_codes_expires_idx" ON "invite_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "history_user_video_idx" ON "listening_history" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "history_user_played_idx" ON "listening_history" USING btree ("user_id","last_played_at");--> statement-breakpoint
CREATE INDEX "remote_actions_session_idx" ON "remote_actions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "remote_actions_created_idx" ON "remote_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "remote_sessions_parent_idx" ON "remote_sessions" USING btree ("parent_user_id");--> statement-breakpoint
CREATE INDEX "remote_sessions_child_idx" ON "remote_sessions" USING btree ("child_user_id");--> statement-breakpoint
CREATE INDEX "remote_sessions_status_idx" ON "remote_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "search_logs_created_idx" ON "search_logs" USING btree ("created_at");