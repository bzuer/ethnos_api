# Database Indexes Documentation

## Primary Indexes

### Core Table Indexes
- **works**: PRIMARY KEY (id), UNIQUE KEY (doi), INDEX (venue_id), INDEX (publication_year)
- **persons**: PRIMARY KEY (id), UNIQUE KEY (orcid), INDEX (preferred_name), INDEX (is_verified)  
- **organizations**: PRIMARY KEY (id), UNIQUE KEY (ror_id), INDEX (name), INDEX (country_code, type)

### Relationship Indexes
- **authorships**: PRIMARY KEY (work_id, person_id), INDEX (person_id), INDEX (affiliation_id)
- **citations**: PRIMARY KEY (citing_work_id, cited_work_id), INDEX (cited_work_id)
- **publications**: PRIMARY KEY (work_id), INDEX (venue_id)

## Search Optimization Indexes

### Full-Text Indexes
- **works**: FULLTEXT (title, abstract_text) for academic content search
- **persons**: FULLTEXT (preferred_name, name_variations) for author search
- **organizations**: FULLTEXT (name) for institutional search

### Performance Indexes
- **work_author_summary**: INDEX (work_id), INDEX (first_author_id) for rapid author lookup
- **files**: INDEX (file_hash), INDEX (file_format) for file management
- **sphinx_queue**: INDEX (status, created_at) for queue processing

## Composite Indexes

### Multi-Column Optimization
- **authorships**: INDEX (work_id, author_order) for ordered author lists
- **citations**: INDEX (citing_work_id, citation_context) for contextual analysis
- **subjects**: INDEX (work_id, subject_id) for topical categorization

### Temporal Indexes
- **works**: INDEX (publication_year, venue_id) for chronological analysis
- **metrics**: INDEX (endpoint, timestamp) for performance monitoring

## Foreign Key Indexes

### Referential Integrity
- All foreign key relationships have corresponding indexes for JOIN optimization
- Cascade deletion paths optimized with appropriate index coverage
- Cross-table relationship queries sub-10ms with proper index utilization

## Sphinx Integration Indexes

### Search Engine Optimization
- **works_poc**: 650K documents with title/abstract/author full-text indexing
- **persons_poc**: 386K documents with name variation and identifier indexing
- **organizations_poc**: 204K documents with institutional name and location indexing

### Real-Time Indexing
- **works_rt**: Real-time index for immediate search result updates
- Queue-based synchronization with MariaDB primary storage
- Automatic failover to MariaDB FULLTEXT indexes on Sphinx unavailability

## Performance Metrics

**Index Coverage**: 95% of queries utilize indexes  
**Query Performance**: Sub-5ms for single-table indexed lookups  
**JOIN Performance**: Sub-50ms for complex multi-table queries  
**Search Performance**: 2-4ms Sphinx execution, 100-300ms MariaDB FULLTEXT fallback