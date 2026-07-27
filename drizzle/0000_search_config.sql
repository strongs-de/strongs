-- Search infrastructure. Must run before the tables, because `verses.search_vector` is a generated
-- column referencing the text search configuration created here.

-- `unaccent` folds diacritics so a search for "Gruesse" style input still matches; `pg_trgm` powers
-- the "did you mean" suggestion and fuzzy name matching.
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint

-- German full-text configuration with accent folding.
--
-- A generated column may only call immutable functions. `unaccent(text)` is merely stable, because
-- its dictionary can be reloaded, so `to_tsvector('german', unaccent(text))` is rejected. Wiring
-- unaccent into a named configuration and calling `to_tsvector('german_unaccent', text)` with the
-- configuration spelled out is immutable, and therefore allowed.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'german_unaccent') THEN
        CREATE TEXT SEARCH CONFIGURATION german_unaccent (COPY = german);

        ALTER TEXT SEARCH CONFIGURATION german_unaccent
            ALTER MAPPING FOR hword, hword_part, word, asciiword, asciihword
            WITH unaccent, german_stem;
    END IF;
END
$$;
