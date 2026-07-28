-- Precomputed Strong's statistics for the study sidebar.
--
-- The previous version recomputed both of these in Python on every sidebar request: it loaded every
-- verse containing the number, scanned each one with string searches, and counted the renderings
-- (see legacy/strongs/views_strong_details.py). These views turn that into two indexed reads.
--
-- Refreshed at the end of an import; see src/lib/server/db/statistics.ts.

-- How often a Strong's number occurs per resource, and in how many distinct verses.
CREATE MATERIALIZED VIEW strong_stats AS
SELECT
    resource_id,
    strong,
    count(*)::integer AS occurrences,
    count(DISTINCT verse_id)::integer AS verse_count,
    min(book_id)::integer AS first_book,
    max(book_id)::integer AS last_book
FROM verse_words
GROUP BY resource_id, strong;
--> statement-breakpoint

CREATE UNIQUE INDEX strong_stats_key_idx ON strong_stats (resource_id, strong);
--> statement-breakpoint
CREATE INDEX strong_stats_strong_idx ON strong_stats (strong);
--> statement-breakpoint

-- Which words a translation uses to render a Strong's number, and how often — the frequency table
-- shown under "Übersetzt als".
--
-- Renderings are grouped case-insensitively on a trimmed form so that "Liebe", "liebe" and "Liebe "
-- count as one; `display` keeps the most common spelling for presentation.
CREATE MATERIALIZED VIEW strong_glosses AS
WITH normalized AS (
    SELECT
        resource_id,
        strong,
        lower(btrim(word)) AS gloss,
        btrim(word) AS display
    FROM verse_words
    WHERE btrim(word) <> ''
),
counted AS (
    SELECT
        resource_id,
        strong,
        gloss,
        count(*)::integer AS occurrences,
        mode() WITHIN GROUP (ORDER BY display) AS display
    FROM normalized
    GROUP BY resource_id, strong, gloss
)
SELECT
    resource_id,
    strong,
    display,
    gloss,
    occurrences,
    row_number() OVER (
        PARTITION BY resource_id, strong
        ORDER BY occurrences DESC, gloss ASC
    )::integer AS rank
FROM counted;
--> statement-breakpoint

CREATE UNIQUE INDEX strong_glosses_key_idx ON strong_glosses (resource_id, strong, gloss);
--> statement-breakpoint
CREATE INDEX strong_glosses_rank_idx ON strong_glosses (resource_id, strong, rank);
