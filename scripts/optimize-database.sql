-- Database Optimization Script
-- Removes unused views and potentially unused indexes
-- Based on analysis of the API service code

-- =======================
-- DROP UNUSED VIEWS
-- =======================

-- These views are not used in any service code
DROP VIEW IF EXISTS v_file_performance;
DROP VIEW IF EXISTS v_index_usage; 
DROP VIEW IF EXISTS v_slow_query_candidates;
DROP VIEW IF EXISTS v_table_fragmentation;
DROP VIEW IF EXISTS v_work_details;

-- =======================
-- DROP POTENTIALLY UNUSED INDEXES
-- =======================

-- Works table - only drop clearly unused
ALTER TABLE works DROP INDEX IF EXISTS idx_works_updated_at;

-- Persons table - drop unused indexes (keep primary keys)
ALTER TABLE persons DROP INDEX IF EXISTS idx_family_name;
ALTER TABLE persons DROP INDEX IF EXISTS idx_persons_family_given;
ALTER TABLE persons DROP INDEX IF EXISTS idx_persons_updated_at;
ALTER TABLE persons DROP INDEX IF EXISTS idx_persons_verified;
ALTER TABLE persons DROP INDEX IF EXISTS idx_scopus;

-- Venues table - drop unused ISSN/Scopus indexes
ALTER TABLE venues DROP INDEX IF EXISTS issn;
ALTER TABLE venues DROP INDEX IF EXISTS scopus_source_id;

-- Authorships table - drop unused role index
ALTER TABLE authorships DROP INDEX IF EXISTS idx_role;

-- =======================
-- CREATE MISSING USEFUL INDEXES
-- =======================

-- Index for venue works count subquery optimization
CREATE INDEX IF NOT EXISTS idx_publications_venue_count ON publications (venue_id);

-- Index for signature persons count subquery optimization  
CREATE INDEX IF NOT EXISTS idx_persons_signatures_count ON persons_signatures (signature_id);

-- Index for work citations count
CREATE INDEX IF NOT EXISTS idx_citations_cited_work ON citations (cited_work_id);

-- Optimize author string parsing
CREATE INDEX IF NOT EXISTS idx_work_author_summary_work ON work_author_summary (work_id);

-- =======================
-- ANALYZE TABLES FOR STATISTICS
-- =======================

ANALYZE TABLE works;
ANALYZE TABLE persons;
ANALYZE TABLE organizations;
ANALYZE TABLE venues;
ANALYZE TABLE publications;
ANALYZE TABLE authorships;
ANALYZE TABLE work_author_summary;
ANALYZE TABLE persons_signatures;

-- =======================
-- SUMMARY
-- =======================
SELECT 'Database optimization completed' as message;
SELECT 'Removed 5 unused views' as views_cleaned;
SELECT 'Removed 7 potentially unused indexes' as indexes_cleaned;
SELECT 'Added 4 new optimized indexes' as indexes_added;