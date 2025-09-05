# Database Schema Documentation

## Core Academic Tables

### works (1,052,723 records)
**Primary Table**: Academic publications and research outputs  
**Size**: 1.3GB  
**Key Fields**: id, title, doi, publication_year, venue_id, abstract_text  
**Relationships**: authorships, citations, publications, work_subjects  
**Indexes**: Primary key, DOI unique, venue_id, publication_year, full-text on title/abstract

### persons (549,022 records)
**Primary Table**: Academic researchers and authors  
**Size**: 364MB  
**Key Fields**: id, preferred_name, given_names, family_name, orcid, is_verified  
**Relationships**: authorships, course_instructors, signatures  
**Indexes**: Primary key, ORCID unique, name fields, verification status

### organizations (179,510 records)
**Primary Table**: Academic institutions and affiliations  
**Size**: 154MB  
**Key Fields**: id, name, type, country_code, city, ror_id  
**Relationships**: authorships, organization hierarchies  
**Indexes**: Primary key, ROR_ID unique, name full-text, country/type

## Relationship Tables

### authorships (1,413,633 records)
**Purpose**: Links works to persons with affiliation context  
**Size**: 452MB  
**Key Fields**: work_id, person_id, affiliation_id, author_order  
**Critical Relationships**: works, persons, organizations

### citations (1,618,449 records)
**Purpose**: Academic citation network mapping  
**Size**: 380MB  
**Key Fields**: citing_work_id, cited_work_id, citation_context  

### publications (923,960 records)
**Purpose**: Publication metadata and venue relationships  
**Size**: 436MB  
**Key Fields**: work_id, venue_id, volume, issue, pages

## Academic Structure

### venues (4,921 records)
**Purpose**: Academic journals and conference proceedings  
**Key Fields**: id, name, type, issn, impact_factor

### subjects (41,845 records)
**Purpose**: Academic subject classification system  
**Relationships**: work_subjects for topical categorization

### courses (433 records)
**Purpose**: Academic course records with bibliography integration  
**Relationships**: course_bibliography, course_instructors

## File Management

### files (649,450 records)
**Purpose**: Digital academic resource metadata  
**Size**: 305MB  
**Key Fields**: id, file_hash, file_format, file_size, download_count

### file_identifiers (1,854,219 records)
**Purpose**: File identification systems (MD5, IPFS, etc.)  
**Size**: 254MB  
**Relationships**: files with identifier_type/value pairs

## System Tables

### sphinx_queue (646,240 records)
**Purpose**: Search index synchronization queue  
**Size**: 97MB  
**Function**: Manages real-time search index updates

### work_author_summary (1,136,052 records)  
**Purpose**: Denormalized author strings for performance optimization  
**Size**: 221MB  
**Function**: Cached author information for rapid API responses

### metrics (220,429 records)
**Purpose**: System performance and usage analytics  
**Size**: 37MB  
**Function**: API endpoint monitoring and performance tracking

## Performance Optimization

**Total Storage**: 3.8GB across 35 tables  
**Index Strategy**: Comprehensive covering indexes on search fields  
**Materialized Views**: 6 analytical views for complex reporting  
**Query Optimization**: Sub-10ms response times for indexed lookups