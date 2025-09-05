-- Sphinx Relevance Optimization for Bibliographic Data
-- Analysis of content distribution for better indexing

-- Check content distribution
SELECT 
    'Total Works' as metric,
    COUNT(*) as count,
    '100%' as percentage
FROM works
UNION ALL
SELECT 
    'With Title' as metric,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works), 1), '%') as percentage
FROM works 
WHERE title IS NOT NULL AND title != ''
UNION ALL
SELECT 
    'With Abstract' as metric,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works), 1), '%') as percentage
FROM works 
WHERE abstract IS NOT NULL AND abstract != ''
UNION ALL
SELECT 
    'With Author String' as metric,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works), 1), '%') as percentage
FROM works 
WHERE author_string IS NOT NULL AND author_string != ''
UNION ALL
SELECT 
    'With Venue' as metric,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works), 1), '%') as percentage
FROM works 
WHERE venue_name IS NOT NULL AND venue_name != ''
UNION ALL
SELECT 
    'With DOI' as metric,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works), 1), '%') as percentage
FROM works 
WHERE doi IS NOT NULL AND doi != '';

-- Check work types distribution
SELECT 
    'Work Types Distribution' as analysis;
    
SELECT 
    work_type,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works), 1), '%') as percentage
FROM works 
WHERE work_type IS NOT NULL
GROUP BY work_type
ORDER BY count DESC
LIMIT 10;

-- Check language distribution  
SELECT 
    'Language Distribution' as analysis;

SELECT 
    language,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works), 1), '%') as percentage
FROM works 
WHERE language IS NOT NULL AND language != 'unknown'
GROUP BY language
ORDER BY count DESC
LIMIT 10;

-- Check year distribution
SELECT 
    'Year Distribution (Recent)' as analysis;

SELECT 
    year,
    COUNT(*) as count
FROM works 
WHERE year >= 2020 AND year <= 2025
GROUP BY year
ORDER BY year DESC;

-- Analyze content quality for better indexing weights
SELECT 
    'Content Quality Analysis' as analysis;

SELECT 
    CASE 
        WHEN char_length(title) < 20 THEN 'Short Title (<20 chars)'
        WHEN char_length(title) BETWEEN 20 AND 50 THEN 'Medium Title (20-50 chars)'
        WHEN char_length(title) BETWEEN 51 AND 100 THEN 'Long Title (51-100 chars)'
        ELSE 'Very Long Title (>100 chars)'
    END as title_length_category,
    COUNT(*) as count,
    CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM works WHERE title IS NOT NULL), 1), '%') as percentage
FROM works 
WHERE title IS NOT NULL AND title != ''
GROUP BY title_length_category
ORDER BY count DESC;

-- Check abstract availability by work type
SELECT 
    'Abstract Availability by Work Type' as analysis;

SELECT 
    work_type,
    COUNT(*) as total_works,
    COUNT(CASE WHEN abstract IS NOT NULL AND abstract != '' THEN 1 END) as with_abstract,
    CONCAT(ROUND(
        COUNT(CASE WHEN abstract IS NOT NULL AND abstract != '' THEN 1 END) * 100.0 / COUNT(*), 1
    ), '%') as abstract_percentage
FROM works 
WHERE work_type IS NOT NULL
GROUP BY work_type
ORDER BY total_works DESC;

-- Most cited venues (for relevance weighting)
SELECT 
    'Top Academic Venues' as analysis;

SELECT 
    venue_name,
    COUNT(*) as work_count,
    COUNT(DISTINCT author_string) as unique_authors
FROM works 
WHERE venue_name IS NOT NULL AND venue_name != ''
AND work_type IN ('ARTICLE', 'CONFERENCE_PAPER')
GROUP BY venue_name
ORDER BY work_count DESC
LIMIT 20;