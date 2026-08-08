-- The default palette is persisted per user. Refresh only the ten seeded slots whose colours still
-- match either the original palette or the adjusted palette; user-added colours start at sort order
-- 10 and are deliberately left untouched.
UPDATE "highlight_styles"
SET
	"color" = CASE lower("color")
		WHEN '#fde68a' THEN '#FFF1C6'
		WHEN '#fff1c6' THEN '#FFF1C6'
		WHEN '#a7f3d0' THEN '#D6EDCF'
		WHEN '#d6edcf' THEN '#D6EDCF'
		WHEN '#bfdbfe' THEN '#C5E3F4'
		WHEN '#c5e3f4' THEN '#C5E3F4'
		WHEN '#fecaca' THEN '#F8C2C2'
		WHEN '#f8c2c2' THEN '#F8C2C2'
		WHEN '#fed7aa' THEN '#F8D6C1'
		WHEN '#f8d6c1' THEN '#F8D6C1'
		ELSE lower("color")
	END,
	"sort_order" = CASE lower("color")
		WHEN '#fde68a' THEN 0
		WHEN '#fff1c6' THEN 0
		WHEN '#a7f3d0' THEN 1
		WHEN '#d6edcf' THEN 1
		WHEN '#bfdbfe' THEN 2
		WHEN '#c5e3f4' THEN 2
		WHEN '#fecaca' THEN 3
		WHEN '#f8c2c2' THEN 3
		WHEN '#fed7aa' THEN 4
		WHEN '#f8d6c1' THEN 4
		WHEN '#e5e7eb' THEN 5
		WHEN '#fbcfe8' THEN 6
		WHEN '#e9d5ff' THEN 7
		WHEN '#99f6e4' THEN 8
		WHEN '#c7d2fe' THEN 9
	END,
	"updated_at" = now()
WHERE "sort_order" BETWEEN 0 AND 9
	AND lower("color") IN (
		'#fde68a', '#fff1c6', '#a7f3d0', '#d6edcf', '#bfdbfe', '#c5e3f4',
		'#fecaca', '#f8c2c2', '#fed7aa', '#f8d6c1', '#e5e7eb', '#fbcfe8',
		'#e9d5ff', '#99f6e4', '#c7d2fe'
	);
