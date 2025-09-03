# Database Views

## Analytical Views

### v_works_by_signature
**Purpose**: Author disambiguation through signature matching  
**Usage**: Used by instructors statistics and authorship analysis  
**Performance**: Optimized for person_id lookups with signature verification

### v_institution_productivity
**Purpose**: Organizational output metrics and rankings  
**Usage**: Institution analytics endpoints  
**Metrics**: Publication counts, collaboration networks, productivity trends

### v_collaborations
**Purpose**: Inter-institutional collaboration analysis  
**Usage**: Network analysis and partnership identification  
**Scope**: Cross-organizational relationship mapping

### v_venue_ranking
**Purpose**: Journal impact and citation analysis  
**Usage**: Venue statistics and academic impact assessment  
**Metrics**: Citation counts, h-index calculations, venue impact factors

### v_person_production
**Purpose**: Individual researcher productivity metrics  
**Usage**: Personal academic profiles and statistics  
**Metrics**: Publication counts, citation impact, collaboration patterns

### v_annual_stats
**Purpose**: Temporal academic output analysis  
**Usage**: Dashboard analytics and trend visualization  
**Scope**: Year-over-year publication and citation trends

## Performance Characteristics

**Materialized**: All views use efficient JOIN strategies  
**Indexing**: Backed by comprehensive index coverage  
**Caching**: 30-minute TTL for analytical endpoints  
**Optimization**: Designed for sub-100ms query response times