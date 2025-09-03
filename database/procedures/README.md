# Database Procedures

## Active Procedures

### sp_update_work_author_summary
**Purpose**: Maintains work_author_summary table with aggregated authorship data  
**Execution**: Batch processing for author string generation  
**Parameters**: None (processes all records)  
**Usage**: Called during data synchronization operations

**Function**:
- Generates concatenated author strings from authorships table
- Updates first_author_id for each work
- Maintains referential integrity between works and persons
- Optimizes query performance for author-related endpoints

**Performance**: Processes 1.1M work records with complex JOINs across persons and authorships tables

## Maintenance

**Frequency**: On-demand execution during data updates  
**Dependencies**: persons, works, authorships tables  
**Monitoring**: Execution logged in processing_log table