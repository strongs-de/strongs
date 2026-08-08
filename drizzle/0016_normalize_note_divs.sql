-- Chromium represents new lines in contenteditable fields as div elements. The sanitizer used to
-- escape those wrappers, so notes saved before the fix displayed the tag text after a reload.
UPDATE "verse_comments"
SET "comment_html" = replace(
	replace("comment_html", '&lt;div&gt;', '<div>'),
	'&lt;/div&gt;',
	'</div>'
)
WHERE "comment_html" LIKE '%&lt;div&gt;%'
	OR "comment_html" LIKE '%&lt;/div&gt;%';

UPDATE "verse_list_items"
SET "note_html" = replace(
	replace("note_html", '&lt;div&gt;', '<div>'),
	'&lt;/div&gt;',
	'</div>'
)
WHERE "note_html" LIKE '%&lt;div&gt;%'
	OR "note_html" LIKE '%&lt;/div&gt;%';
