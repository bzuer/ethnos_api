# Database Documentation

## Structure Overview

**Schema**: data_db  
**Engine**: MariaDB  
**Total Tables**: 35 tables + 6 views  
**Data Scale**: ~1.1M works, 549K persons, 179K organizations

## Directory Structure

```
database/
├── schema/          # Table structures and definitions
├── procedures/      # Stored procedures documentation
├── views/          # Database views definitions
├── indexes/        # Index strategies and optimization
└── README.md       # This overview document
```

## Core Tables by Category

### Academic Works (3.7M records)
- `works` (1.1M) - Primary academic publications
- `publications` (924K) - Publication metadata
- `citations` (1.6M) - Citation relationships
- `authorships` (1.4M) - Author-work relationships

### Academic Entities (728K records)
- `persons` (549K) - Academic researchers and authors
- `organizations` (179K) - Academic institutions
- `venues` (4.9K) - Academic journals and conferences

### File Management (2.4M records)
- `files` (649K) - Digital file metadata
- `file_identifiers` (1.9M) - File identification systems
- `publication_files` (865K) - File-publication relationships

### Academic Structure (57K records)
- `subjects` (42K) - Academic subject classifications
- `courses` (433) - Academic course records
- `course_bibliography` (15K) - Course reading lists

### System Operations (866K records)
- `sphinx_queue` (646K) - Search index processing queue
- `metrics` (220K) - System performance data
- `processing_log` (387) - System operation logs

## Performance Views

### Analytical Views
- `v_works_by_signature` - Author disambiguation via signatures
- `v_institution_productivity` - Organizational output metrics
- `v_collaborations` - Inter-institutional collaboration networks
- `v_venue_ranking` - Journal impact and citation analysis
- `v_person_production` - Individual researcher productivity
- `v_annual_stats` - Temporal academic output trends

## Database Statistics

**Total Size**: ~3.8GB  
**Largest Tables**: works (1.3GB), authorships (452MB), publications (436MB), citations (380MB)  
**Index Coverage**: Comprehensive indexing on primary keys, foreign keys, search fields  
**Optimization**: Materialized views for complex analytical queries

## Access Patterns

**Primary Endpoints**: Works, persons, organizations with full-text search capability  
**Search Engine**: Sphinx integration with 7 operational indexes  
**Cache Strategy**: Redis 30-minute TTL with graceful degradation  
**Performance**: Sub-10ms response times for optimized queries