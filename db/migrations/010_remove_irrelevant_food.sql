-- One-time cleanup: drop scraped street-food / cheap-eats / fast-food leads
-- (koshari, foul, ta3meya, shawarma, fast-food chains…) — never buyers of
-- premium outdoor furniture. New scans skip these at ingest
-- (src/lib/engine/util/relevance.ts — keep this regex in sync with it).
-- Idempotent: re-running deletes nothing once clean. FKs cascade.
DELETE FROM leads
 WHERE category IN ('restaurant','cafe')
   AND name ~* '(kosh?[ae]r[iy]|kushari|كشري|\mfoul\M|\mfool\M|\mful\M|\mfuul\M|فول|ta+[3a]?me+y+a|falafel|طعمية|فلافل|shawe?rma|شاورما|hawawshi|حواوشي|\mkebda\M|\mkibda\M|كبدة|f[ei]te+r|fatatr[iy]|فطير|\mkoshk\M|\mkiosk\M|كشك|street ?food|take ?away|\msnack\M|mcdonald|\mkfc\M|burger king|hardee|pizza hut|domino''?s|\msubway\M|papa john)';
