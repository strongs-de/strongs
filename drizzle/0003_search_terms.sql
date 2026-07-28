-- Vocabulary of the imported text, for "did you mean" suggestions.
--
-- `ts_stat` walks every verse's search vector and returns each lexeme with the number of verses it
-- appears in. A trigram index over that makes a fuzzy lookup cheap, which is what turns a search for
-- "Gerechtikeit" into a suggestion of "gerechtigkeit".
--
-- Materialised because ts_stat scans the whole table; refreshed after an import, together with the
-- Strong's statistics.
-- The table is schema-qualified because ts_stat runs its argument as a nested query, resolved against
-- whatever search_path the session happens to have — and the migration runner's is not the app's.
CREATE MATERIALIZED VIEW search_terms AS
SELECT word, ndoc, nentry
FROM ts_stat('SELECT search_vector FROM public.verses')
WHERE length(word) >= 3;
--> statement-breakpoint

CREATE UNIQUE INDEX search_terms_word_idx ON search_terms (word);
--> statement-breakpoint
CREATE INDEX search_terms_trgm_idx ON search_terms USING gin (word gin_trgm_ops);
