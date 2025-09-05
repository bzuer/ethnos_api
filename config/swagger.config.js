const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
        title: 'Ethnos.app Academic Bibliography API',
        version: '2.0.0',
        description: `
## Ethnos.app Academic Bibliography API v2.0.0 - Production Ready

**DOI**: 10.5281/zenodo.17041680  
**Status**: Enterprise-ready academic research infrastructure

### Overview

The Ethnos.app Academic Bibliography API is a comprehensive RESTful service built with standardized technical architecture for bibliographic research across all knowledge domains. While currently deployed as the core data infrastructure for the Ethnos.app platform focusing on Social Anthropology, the API's robust design, standardized endpoints, and universal academic metadata structure enable application across any field of scholarly research.

### Technical Infrastructure

- **High-Performance Search Engine**: Sphinx 2.2.11 delivering 221x performance improvement (2-4ms vs 450ms traditional search)
- **Comprehensive Database**: 1.16M academic works, 549K researcher profiles, 183K organizations, 4.9K venues
- **Professional Security**: Complete vulnerability audit with all critical issues resolved, environment variable enforcement
- **Production Monitoring**: Real-time performance tracking, structured logging, comprehensive error handling
- **Universal Standards**: Compatible with DOI, ORCID, ROR, and international academic identifiers

### Data Coverage & Performance

- **Academic Works**: 1,163,415 publications with complete metadata and author integration
- **Researcher Profiles**: 549,147 persons with ORCID, Lattes, Scopus integration
- **Institutional Data**: 182,847 organizations with ROR ID linking and productivity analytics
- **Search Performance**: 2-4ms Sphinx execution, <100ms total HTTP response times
- **Course Integration**: 433 academic courses with comprehensive bibliography analysis
- **Citation Networks**: Complete reference mapping and collaboration analysis

### Access & Rate Limiting

Public API with no authentication required. Rate limiting: 100 requests/minute general, 20/minute search, 10/minute downloads, 30/minute metrics. Academic institutions (.edu/.ac domains) receive expanded limits. Professional abuse protection with automatic blocking and pattern detection.

### Quick Start Examples

- Health Check: GET /health
- Search Works: GET /search/works?q=anthropology&limit=10  
- Researcher Profile: GET /persons/{id}
- Institution Data: GET /organizations/{id}
- API Documentation: GET /docs

Service operates under MIT license with technical support available through ethnos.app platform.
      `,
      Licence: `
## The MIT License
Copyright 2025 ethnos_app api

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    `,
      Staff: `
## Technical Team

**Developer**: Bruno Cesar Cunha Cruz, PhD Student  
**Institution**: PPGAS/MN/UFRJ (Graduate Program in Social Anthropology, National Museum, Federal University of Rio de Janeiro)  
**Project**: Academic Bibliography System for Universal Scholarly Research  
**DOI**: 10.5281/zenodo.17041680  
**Website**: https://ethnos.app
    `,
      Contact: {
        name: 'Ethnos.app Technical Support',
        url: 'https://ethnos.app',
        email: 'support@ethnos.app'
      },
      License: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT'
      },
      termsOfService: 'https://ethnos.app/terms'
    },
    servers: [
      {
        url: 'https://api.ethnos.app',
        description: 'Production API server'
      }
    ],
    externalDocs: {
      description: 'Ethnos.app - Universal Academic Bibliography Platform',
      url: 'https://ethnos.app'
    },
    'x-logo': {
      url: 'https://ethnos.app/logo.png',
      altText: 'Ethnos.app Academic Bibliography API'
    },
    'x-api-id': '10.5281/zenodo.17041680',
    components: {
      schemas: {
        Error: {
          type: 'object',
          required: ['status', 'message'],
          properties: {
            status: {
              type: 'string',
              example: 'error'
            },
            message: {
              type: 'string',
              example: 'Resource not found'
            },
            code: {
              type: 'string',
              example: 'NOT_FOUND'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Work: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 123456,
              description: 'Unique identifier for the work'
            },
            title: {
              type: 'string',
              example: 'Machine Learning Applications in Academic Research: A Comprehensive Survey',
              description: 'Primary title of the work'
            },
            subtitle: {
              type: 'string',
              nullable: true,
              example: 'An Analysis of Current Trends and Future Directions',
              description: 'Subtitle of the work'
            },
            abstract: {
              type: 'string',
              nullable: true,
              example: 'This paper presents a comprehensive survey of machine learning applications in academic research, covering methodologies, tools, and emerging trends across multiple disciplines. We analyze current approaches, identify gaps, and propose future research directions.',
              description: 'Abstract or summary of the work'
            },
            type: {
              type: 'string',
              enum: ['ARTICLE', 'BOOK', 'CHAPTER', 'THESIS', 'CONFERENCE', 'REPORT', 'DATASET', 'OTHER'],
              example: 'ARTICLE',
              description: 'Type of academic work'
            },
            language: {
              type: 'string',
              nullable: true,
              example: 'en',
              description: 'ISO 639 language code'
            },
            publication: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'integer',
                  nullable: true,
                  description: 'Publication record ID'
                },
                year: {
                  type: 'integer',
                  nullable: true,
                  example: 2023,
                  description: 'Publication year'
                },
                volume: {
                  type: 'string',
                  nullable: true,
                  example: '15',
                  description: 'Volume number'
                },
                issue: {
                  type: 'string',
                  nullable: true,
                  example: '3',
                  description: 'Issue number'
                },
                pages: {
                  type: 'string',
                  nullable: true,
                  example: '1-25',
                  description: 'Page range'
                },
                doi: {
                  type: 'string',
                  nullable: true,
                  example: '10.1038/s42256-023-00123-4',
                  description: 'Digital Object Identifier from publications table'
                },
                temp_doi: {
                  type: 'string',
                  nullable: true,
                  example: '10.1038/temp.2023.001',
                  description: 'Temporary DOI from works table'
                },
                peer_reviewed: {
                  type: 'boolean',
                  example: true,
                  description: 'Peer review status'
                },
                publication_date: {
                  type: 'string',
                  format: 'date',
                  nullable: true,
                  example: '2023-06-15',
                  description: 'Exact publication date'
                }
              },
              description: 'Publication metadata'
            },
            venue: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'integer',
                  example: 1,
                  description: 'Venue ID'
                },
                name: {
                  type: 'string',
                  example: 'Nature Machine Intelligence',
                  description: 'Venue name'
                },
                type: {
                  type: 'string',
                  enum: ['JOURNAL', 'CONFERENCE', 'REPOSITORY', 'BOOK_SERIES'],
                  example: 'JOURNAL',
                  description: 'Venue type'
                },
                issn: {
                  type: 'string',
                  nullable: true,
                  example: '2522-5839',
                  description: 'ISSN identifier'
                },
                eissn: {
                  type: 'string',
                  nullable: true,
                  example: '2522-5847',
                  description: 'Electronic ISSN'
                },
                scopus_source_id: {
                  type: 'string',
                  nullable: true,
                  example: '21100865475',
                  description: 'Scopus source ID'
                }
              },
              description: 'Publication venue information'
            },
            publisher: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'integer',
                  example: 13,
                  description: 'Publisher ID'
                },
                name: {
                  type: 'string',
                  example: 'Springer Nature',
                  description: 'Publisher name'
                },
                type: {
                  type: 'string',
                  enum: ['ACADEMIC', 'COMMERCIAL', 'UNIVERSITY', 'SOCIETY', 'GOVERNMENT', 'OTHER'],
                  example: 'COMMERCIAL',
                  description: 'Publisher type'
                },
                country: {
                  type: 'string',
                  nullable: true,
                  example: 'United Kingdom',
                  description: 'Publisher country'
                },
                website: {
                  type: 'string',
                  nullable: true,
                  example: 'https://www.springernature.com',
                  description: 'Publisher website'
                }
              },
              description: 'Publisher information'
            },
            author_count: {
              type: 'integer',
              example: 3,
              description: 'Number of authors'
            },
            authors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Dr. Maria Silva Santos', 'Prof. João Carlos Lima', 'Ana Paula Costa'],
              description: 'List of author names'
            },
            first_author: {
              type: 'object',
              nullable: true,
              properties: {
                id: {
                  type: 'integer',
                  example: 5952,
                  description: 'First author person ID'
                },
                name: {
                  type: 'string',
                  example: 'Dr. Maria Silva Santos',
                  description: 'First author name'
                }
              },
              description: 'First author information'
            },
            identifiers: {
              type: 'object',
              description: 'External identifiers for this work',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              example: {
                doi: ['10.1038/s42256-023-00123-4'],
                pmid: ['37845123'],
                arxiv: ['2301.00123'],
                handle: ['11449/123456']
              }
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-15T10:30:00Z',
              description: 'Creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              example: '2023-06-20T14:22:00Z',
              description: 'Last update timestamp'
            }
          }
        },
        Person: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 5952,
              description: 'Unique identifier for the person'
            },
            full_name: {
              type: 'string',
              example: 'Dr. Maria Silva Santos',
              description: 'Full name of the person'
            },
            given_names: {
              type: 'string',
              example: 'Maria Silva',
              description: 'Given names'
            },
            family_name: {
              type: 'string',
              example: 'Santos',
              description: 'Family name or surname'
            },
            name_variations: {
              type: 'string',
              example: 'M. S. Santos, Maria S. Santos, M. Silva Santos',
              description: 'Alternative name formats and variations'
            },
            orcid: {
              type: 'string',
              example: '0000-0002-1825-0097',
              description: 'ORCID identifier'
            },
            lattes_id: {
              type: 'string',
              example: '1234567890123456',
              description: 'Lattes CV platform ID (Brazil)'
            },
            scopus_id: {
              type: 'string',
              example: '57194582100',
              description: 'Scopus Author ID'
            },
            wos_id: {
              type: 'string',
              example: 'A-1234-2023',
              description: 'Web of Science ResearcherID'
            },
            primary_affiliation: {
              $ref: '#/components/schemas/Organization',
              description: 'Primary institutional affiliation'
            },
            works_count: {
              type: 'integer',
              example: 45,
              description: 'Total number of works authored'
            },
            h_index: {
              type: 'integer',
              example: 12,
              description: 'H-index bibliometric indicator'
            },
            citation_count: {
              type: 'integer',
              example: 678,
              description: 'Total citations received'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Organization: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 12345,
              description: 'Unique identifier for the organization'
            },
            name: {
              type: 'string',
              example: 'Universidade de São Paulo',
              description: 'Full name of the organization'
            },
            short_name: {
              type: 'string',
              example: 'USP',
              description: 'Short name or acronym'
            },
            type: {
              type: 'string',
              enum: ['UNIVERSITY', 'RESEARCH_INSTITUTE', 'COMPANY', 'GOVERNMENT', 'NGO', 'HOSPITAL'],
              example: 'UNIVERSITY',
              description: 'Type of organization'
            },
            country: {
              type: 'string',
              example: 'Brazil',
              description: 'Country where organization is located'
            },
            region: {
              type: 'string',
              example: 'South America',
              description: 'Geographic region'
            },
            city: {
              type: 'string',
              example: 'São Paulo',
              description: 'City location'
            },
            website: {
              type: 'string',
              format: 'uri',
              example: 'https://www.usp.br',
              description: 'Official website URL'
            },
            ror_id: {
              type: 'string',
              example: 'https://ror.org/036rp1748',
              description: 'Research Organization Registry ID'
            },
            works_count: {
              type: 'integer',
              example: 125420,
              description: 'Total number of works from this organization'
            },
            members_count: {
              type: 'integer',
              example: 8250,
              description: 'Number of affiliated researchers'
            },
            h_index: {
              type: 'integer',
              example: 245,
              description: 'Institutional H-index'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Author: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 5952
            },
            full_name: {
              type: 'string',
              example: 'Dr. Maria Silva Santos'
            },
            author_position: {
              type: 'integer',
              example: 1,
              description: 'Position in the author list (1-based)'
            },
            is_corresponding: {
              type: 'boolean',
              example: true,
              description: 'Whether this is the corresponding author'
            },
            affiliation: {
              $ref: '#/components/schemas/Organization',
              description: 'Author affiliation at time of publication'
            }
          }
        },
        Venue: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            display_name: {
              type: 'string',
              example: 'Nature Machine Intelligence',
              description: 'Display name of the venue'
            },
            type: {
              type: 'string',
              enum: ['JOURNAL', 'CONFERENCE', 'BOOK_SERIES', 'REPOSITORY', 'OTHER'],
              example: 'JOURNAL'
            },
            issn_l: {
              type: 'string',
              example: '2522-5839',
              description: 'Linking ISSN'
            },
            issn: {
              type: 'string',
              example: '2522-5839',
              description: 'ISSN'
            },
            publisher: {
              type: 'string',
              example: 'Nature Publishing Group',
              description: 'Publisher name'
            },
            is_oa: {
              type: 'boolean',
              example: false,
              description: 'Whether the venue is fully open access'
            },
            impact_factor: {
              type: 'number',
              format: 'float',
              example: 18.5,
              description: 'Journal Impact Factor'
            }
          }
        },
        Citation: {
          type: 'object',
          properties: {
            citing_work_id: {
              type: 'integer',
              example: 123456,
              description: 'ID of the work that makes the citation'
            },
            cited_work_id: {
              type: 'integer',
              example: 654321,
              description: 'ID of the work being cited'
            },
            citation_type: {
              type: 'string',
              enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'SELF'],
              example: 'POSITIVE',
              description: 'Type of citation context'
            },
            context: {
              type: 'string',
              example: 'This methodology builds upon the seminal work by Santos et al. (2023), which demonstrated...',
              description: 'Citation context from the text'
            },
            citing_work: {
              $ref: '#/components/schemas/Work',
              description: 'Details of the citing work'
            }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 789
            },
            hash: {
              type: 'string',
              example: 'a1b2c3d4e5f67890123456789abcdef...',
              description: 'SHA-256 hash of the file'
            },
            size: {
              type: 'integer',
              example: 2048576,
              description: 'File size in bytes'
            },
            size_mb: {
              type: 'number',
              format: 'float',
              example: 2.048,
              description: 'File size in megabytes'
            },
            format: {
              type: 'string',
              enum: ['PDF', 'EPUB', 'HTML', 'XML', 'DOCX', 'TXT', 'OTHER'],
              example: 'PDF'
            },
            version: {
              type: 'string',
              example: '1.0',
              description: 'File version'
            },
            pages: {
              type: 'integer',
              example: 15,
              description: 'Number of pages (for paginated formats)'
            },
            language: {
              type: 'string',
              example: 'en',
              description: 'Language of the file content'
            },
            storage_path: {
              type: 'string',
              example: '/files/2023/01/document.pdf',
              description: 'Storage path'
            },
            storage_provider: {
              type: 'string',
              example: 'local',
              description: 'Storage provider identifier'
            },
            is_available: {
              type: 'boolean',
              example: true,
              description: 'Whether file is available for download'
            },
            access_count: {
              type: 'integer',
              example: 25,
              description: 'Number of times accessed'
            },
            last_accessed_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last access timestamp'
            }
          }
        },
        Collaboration: {
          type: 'object',
          properties: {
            collaborator_id: {
              type: 'integer',
              example: 9876
            },
            collaborator_name: {
              type: 'string',
              example: 'Dr. João Carlos Oliveira'
            },
            collaboration_metrics: {
              type: 'object',
              properties: {
                total_collaborations: {
                  type: 'integer',
                  example: 8,
                  description: 'Total number of collaborative works'
                },
                collaboration_span_years: {
                  type: 'integer',
                  example: 5,
                  description: 'Years of active collaboration'
                },
                avg_citations_together: {
                  type: 'number',
                  format: 'float',
                  example: 24.5,
                  description: 'Average citations for collaborative works'
                },
                first_collaboration_year: {
                  type: 'integer',
                  example: 2018
                },
                latest_collaboration_year: {
                  type: 'integer',
                  example: 2023
                }
              }
            },
            collaboration_strength: {
              type: 'string',
              enum: ['very_strong', 'strong', 'moderate', 'weak'],
              example: 'strong',
              description: 'Calculated collaboration strength category'
            }
          }
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 6894,
              description: 'Total number of results'
            },
            page: {
              type: 'integer',
              example: 1,
              description: 'Current page number'
            },
            limit: {
              type: 'integer',
              example: 20,
              description: 'Number of results per page'
            },
            totalPages: {
              type: 'integer',
              example: 345,
              description: 'Total number of pages'
            },
            hasNext: {
              type: 'boolean',
              example: true,
              description: 'Whether there is a next page'
            },
            hasPrev: {
              type: 'boolean',
              example: false,
              description: 'Whether there is a previous page'
            }
          }
        },
        HealthStatus: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded', 'error'],
              example: 'ok'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              example: 86400.5,
              description: 'Uptime in seconds'
            },
            responseTime: {
              type: 'string',
              example: '15ms'
            },
            version: {
              type: 'string',
              example: '2.0.0'
            },
            environment: {
              type: 'string',
              example: 'production'
            },
            services: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['connected', 'disconnected']
                    },
                    type: {
                      type: 'string',
                      example: 'MariaDB'
                    }
                  }
                },
                cache: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['connected', 'disconnected']
                    },
                    type: {
                      type: 'string',
                      example: 'Redis'
                    }
                  }
                }
              }
            },
            monitoring: {
              type: 'object',
              properties: {
                requests: {
                  type: 'object',
                  properties: {
                    total: {
                      type: 'integer',
                      example: 15420
                    },
                    performance: {
                      type: 'object',
                      properties: {
                        p95_response_time_ms: {
                          type: 'number',
                          example: 85.5
                        }
                      }
                    }
                  }
                },
                errors: {
                  type: 'object',
                  properties: {
                    error_rate: {
                      type: 'string',
                      example: '0.5%'
                    }
                  }
                }
              }
            }
          }
        },
        Signature: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 123,
              description: 'Unique identifier for the signature'
            },
            name_signature: {
              type: 'string',
              example: 'J. Smith',
              description: 'The actual signature or name variant'
            },
            person_id: {
              type: 'integer',
              example: 5952,
              description: 'ID of the associated person'
            },
            signature_length: {
              type: 'integer',
              example: 8,
              description: 'Character length of the signature'
            },
            full_name: {
              type: 'string',
              example: 'John Smith',
              description: 'Full name of the associated person'
            },
            created_at: {
              type: 'string',
              format: 'date-time'
            },
            updated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success'
            },
            totals: {
              type: 'object',
              properties: {
                total_works: {
                  type: 'integer',
                  example: 650645
                },
                total_persons: {
                  type: 'integer',
                  example: 385670
                },
                total_organizations: {
                  type: 'integer',
                  example: 235833
                },
                total_authorships: {
                  type: 'integer',
                  example: 1070000
                },
                total_citations: {
                  type: 'integer',
                  example: 2500000
                }
              }
            },
            recent_trends: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: {
                    type: 'integer',
                    example: 2023
                  },
                  total_publications: {
                    type: 'integer',
                    example: 45620
                  },
                  unique_authors: {
                    type: 'integer',
                    example: 28950
                  },
                  // open_access_percentage removed
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                query_time_ms: {
                  type: 'integer',
                  example: 180
                }
              }
            }
          }
        },
        VenueMetrics: {
          type: 'object',
          properties: {
            venue_id: {
              type: 'integer',
              example: 1
            },
            venue_name: {
              type: 'string',
              example: 'American Anthropologist'
            },
            venue_type: {
              type: 'string',
              example: 'JOURNAL'
            },
            total_works: {
              type: 'integer',
              example: 30961
            },
            unique_authors: {
              type: 'integer',
              example: 12348
            },
            first_publication_year: {
              type: 'integer',
              example: 1888
            },
            latest_publication_year: {
              type: 'integer',
              example: 2025
            },
            // open_access_percentage and open_access_works removed
          }
        },
        SignatureStatistics: {
          type: 'object',
          properties: {
            total_signatures: {
              type: 'integer',
              example: 378134
            },
            short_signatures: {
              type: 'integer',
              example: 234733
            },
            medium_signatures: {
              type: 'integer',
              example: 141374
            },
            long_signatures: {
              type: 'integer',
              example: 2027
            },
            avg_signature_length: {
              type: 'number',
              format: 'float',
              example: 10.136
            },
            linked_signatures: {
              type: 'integer',
              example: 378133
            },
            unlinked_signatures: {
              type: 'integer',
              example: 1
            }
          }
        },
        VenueStatistics: {
          type: 'object',
          properties: {
            total_venues: {
              type: 'integer',
              example: 1179
            },
            journals: {
              type: 'integer',
              example: 1179
            },
            conferences: {
              type: 'integer',
              example: 0
            },
            repositories: {
              type: 'integer',
              example: 0
            },
            book_series: {
              type: 'integer',
              example: 0
            },
            with_impact_factor: {
              type: 'integer',
              example: 42
            },
            avg_impact_factor: {
              type: 'number',
              format: 'float',
              example: 1.7492857
            },
            max_impact_factor: {
              type: 'number',
              format: 'float',
              example: 6.77
            },
            min_impact_factor: {
              type: 'number',
              format: 'float',
              example: 0
            }
          }
        },
        AutocompleteResponse: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              example: 'machine'
            },
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    example: 'Machine Learning Applications'
                  },
                  type: {
                    type: 'string',
                    enum: ['title', 'venue', 'author'],
                    example: 'title'
                  },
                  relevance: {
                    type: 'number',
                    example: 1
                  },
                  preview: {
                    type: 'string',
                    example: 'Machine Learning Applications in...'
                  },
                  work_count: {
                    type: 'integer',
                    example: 5
                  }
                }
              }
            },
            type: {
              type: 'string',
              example: 'all'
            },
            count: {
              type: 'integer',
              example: 8
            },
            generated_at: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Course: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 25,
              description: 'Unique identifier for the course'
            },
            program_id: {
              type: 'integer',
              example: 2,
              description: 'Program identifier'
            },
            code: {
              type: 'string',
              example: 'MNA201',
              description: 'Course code'
            },
            name: {
              type: 'string',
              example: 'AS-201 Instituições Comparadas',
              description: 'Course name'
            },
            credits: {
              type: 'integer',
              nullable: true,
              example: 4,
              description: 'Course credit hours'
            },
            semester: {
              type: 'string',
              enum: ['1', '2', 'SUMMER', 'WINTER', 'YEAR_LONG'],
              example: '2',
              description: 'Course semester'
            },
            year: {
              type: 'integer',
              example: 1968,
              description: 'Academic year'
            },
            instructor_count: {
              type: 'integer',
              example: 2,
              description: 'Number of instructors'
            },
            bibliography_count: {
              type: 'integer',
              example: 25,
              description: 'Number of bibliography items'
            },
            instructors: {
              type: 'string',
              example: 'Bruce Corrie; Roque de Barros Laraia',
              description: 'Instructor names'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            source_file: {
              type: 'string',
              example: '1968.2_-_mna201_-_bruce_corrie___roque_laraia.json',
              description: 'Source file name'
            }
          }
        },
        CourseDetails: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 25,
              description: 'Unique identifier for the course'
            },
            program_id: {
              type: 'integer',
              example: 2,
              description: 'Program identifier'
            },
            code: {
              type: 'string',
              example: 'MNA201',
              description: 'Course code'
            },
            name: {
              type: 'string',
              example: 'AS-201 Instituições Comparadas',
              description: 'Course name'
            },
            credits: {
              type: 'integer',
              nullable: true,
              example: 4,
              description: 'Course credit hours'
            },
            semester: {
              type: 'string',
              enum: ['1', '2', 'SUMMER', 'WINTER', 'YEAR_LONG'],
              example: '2',
              description: 'Course semester'
            },
            year: {
              type: 'integer',
              example: 1968,
              description: 'Academic year'
            },
            instructor_count: {
              type: 'integer',
              example: 2,
              description: 'Number of instructors'
            },
            bibliography_count: {
              type: 'integer',
              example: 25,
              description: 'Number of bibliography items'
            },
            subject_count: {
              type: 'integer',
              example: 15,
              description: 'Number of associated subjects'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            source_file: {
              type: 'string',
              example: '1968.2_-_mna201_-_bruce_corrie___roque_laraia.json',
              description: 'Source file name'
            }
          }
        },
        CourseInstructor: {
          type: 'object',
          properties: {
            course_id: {
              type: 'integer',
              example: 25,
              description: 'Course identifier'
            },
            person_id: {
              type: 'integer',
              example: 31,
              description: 'Original person identifier'
            },
            canonical_person_id: {
              type: 'integer',
              example: 31,
              description: 'Canonical person identifier'
            },
            role: {
              type: 'string',
              enum: ['PROFESSOR', 'ASSISTANT', 'TA', 'GUEST'],
              example: 'PROFESSOR',
              description: 'Instructor role'
            },
            preferred_name: {
              type: 'string',
              example: 'Bruce Corrie',
              description: 'Preferred name'
            },
            given_names: {
              type: 'string',
              example: 'Bruce',
              description: 'Given names'
            },
            family_name: {
              type: 'string',
              example: 'Corrie',
              description: 'Family name'
            },
            orcid: {
              type: 'string',
              nullable: true,
              example: '0000-0002-1825-0097',
              description: 'ORCID identifier'
            },
            is_verified: {
              type: 'boolean',
              example: true,
              description: 'Verification status'
            }
          }
        },
        Instructor: {
          type: 'object',
          properties: {
            person_id: {
              type: 'integer',
              example: 31,
              description: 'Person identifier'
            },
            preferred_name: {
              type: 'string',
              example: 'Bruce Corrie',
              description: 'Preferred name'
            },
            given_names: {
              type: 'string',
              example: 'Bruce',
              description: 'Given names'
            },
            family_name: {
              type: 'string',
              example: 'Corrie',
              description: 'Family name'
            },
            orcid: {
              type: 'string',
              nullable: true,
              example: '0000-0002-1825-0097',
              description: 'ORCID identifier'
            },
            lattes_id: {
              type: 'string',
              nullable: true,
              example: '1234567890123456',
              description: 'Lattes CV platform ID'
            },
            is_verified: {
              type: 'boolean',
              example: true,
              description: 'Verification status'
            },
            courses_taught: {
              type: 'integer',
              example: 15,
              description: 'Number of courses taught'
            },
            programs_count: {
              type: 'integer',
              example: 3,
              description: 'Number of programs involved'
            },
            earliest_year: {
              type: 'integer',
              example: 1968,
              description: 'First year teaching'
            },
            latest_year: {
              type: 'integer',
              example: 2024,
              description: 'Latest year teaching'
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['PROFESSOR', 'ASSISTANT'],
              description: 'Teaching roles'
            },
            program_ids: {
              type: 'array',
              items: {
                type: 'integer'
              },
              example: [2, 3],
              description: 'Program identifiers'
            }
          }
        },
        InstructorDetails: {
          type: 'object',
          properties: {
            person_id: {
              type: 'integer',
              example: 31,
              description: 'Person identifier'
            },
            preferred_name: {
              type: 'string',
              example: 'Bruce Corrie',
              description: 'Preferred name'
            },
            given_names: {
              type: 'string',
              example: 'Bruce',
              description: 'Given names'
            },
            family_name: {
              type: 'string',
              example: 'Corrie',
              description: 'Family name'
            },
            orcid: {
              type: 'string',
              nullable: true,
              example: '0000-0002-1825-0097',
              description: 'ORCID identifier'
            },
            lattes_id: {
              type: 'string',
              nullable: true,
              example: '1234567890123456',
              description: 'Lattes CV platform ID'
            },
            scopus_id: {
              type: 'string',
              nullable: true,
              example: '57194582100',
              description: 'Scopus Author ID'
            },
            is_verified: {
              type: 'boolean',
              example: true,
              description: 'Verification status'
            },
            courses_taught: {
              type: 'integer',
              example: 15,
              description: 'Number of courses taught'
            },
            programs_count: {
              type: 'integer',
              example: 3,
              description: 'Number of programs involved'
            },
            bibliography_contributed: {
              type: 'integer',
              example: 250,
              description: 'Bibliography items contributed'
            },
            earliest_year: {
              type: 'integer',
              example: 1968,
              description: 'First year teaching'
            },
            latest_year: {
              type: 'integer',
              example: 2024,
              description: 'Latest year teaching'
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['PROFESSOR'],
              description: 'Teaching roles'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        Subject: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'Unique identifier for the subject'
            },
            term: {
              type: 'string',
              example: 'Machine Learning',
              description: 'Subject term'
            },
            vocabulary: {
              type: 'string',
              enum: ['KEYWORD', 'MESH', 'LCSH', 'DDC', 'UDC', 'CUSTOM'],
              example: 'KEYWORD',
              description: 'Vocabulary type'
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: null,
              description: 'Parent subject ID for hierarchy'
            },
            works_count: {
              type: 'integer',
              example: 1250,
              description: 'Number of associated works'
            },
            courses_count: {
              type: 'integer',
              example: 25,
              description: 'Number of associated courses'
            },
            children_count: {
              type: 'integer',
              example: 5,
              description: 'Number of child subjects'
            },
            parent_term: {
              type: 'string',
              nullable: true,
              example: 'Artificial Intelligence',
              description: 'Parent subject term'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        SubjectDetails: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
              description: 'Unique identifier for the subject'
            },
            term: {
              type: 'string',
              example: 'Machine Learning',
              description: 'Subject term'
            },
            vocabulary: {
              type: 'string',
              enum: ['KEYWORD', 'MESH', 'LCSH', 'DDC', 'UDC', 'CUSTOM'],
              example: 'KEYWORD',
              description: 'Vocabulary type'
            },
            parent_id: {
              type: 'integer',
              nullable: true,
              example: null,
              description: 'Parent subject ID'
            },
            works_count: {
              type: 'integer',
              example: 1250,
              description: 'Number of associated works'
            },
            courses_count: {
              type: 'integer',
              example: 25,
              description: 'Number of associated courses'
            },
            children_count: {
              type: 'integer',
              example: 5,
              description: 'Number of child subjects'
            },
            parent_term: {
              type: 'string',
              nullable: true,
              example: 'Artificial Intelligence',
              description: 'Parent subject term'
            },
            parent_vocabulary: {
              type: 'string',
              nullable: true,
              example: 'KEYWORD',
              description: 'Parent vocabulary type'
            },
            avg_relevance_score: {
              type: 'number',
              format: 'float',
              example: 0.85,
              description: 'Average relevance score'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        BibliographyEntry: {
          type: 'object',
          properties: {
            course_id: {
              type: 'integer',
              example: 25,
              description: 'Course identifier'
            },
            work_id: {
              type: 'integer',
              example: 2690411,
              description: 'Work identifier'
            },
            reading_type: {
              type: 'string',
              enum: ['REQUIRED', 'RECOMMENDED', 'SUPPLEMENTARY'],
              example: 'RECOMMENDED',
              description: 'Type of reading assignment'
            },
            week_number: {
              type: 'integer',
              nullable: true,
              example: 5,
              description: 'Week number in course'
            },
            notes: {
              type: 'string',
              nullable: true,
              example: 'Essential reading for understanding theoretical foundations',
              description: 'Additional notes'
            },
            course_code: {
              type: 'string',
              example: 'MNA201',
              description: 'Course code'
            },
            course_name: {
              type: 'string',
              example: 'AS-201 Instituições Comparadas',
              description: 'Course name'
            },
            course_year: {
              type: 'integer',
              example: 1968,
              description: 'Course year'
            },
            semester: {
              type: 'string',
              example: '2',
              description: 'Course semester'
            },
            program_id: {
              type: 'integer',
              example: 2,
              description: 'Program identifier'
            },
            title: {
              type: 'string',
              example: 'Comparative Political Institutions',
              description: 'Work title'
            },
            publication_year: {
              type: 'integer',
              example: 1965,
              description: 'Publication year'
            },
            language: {
              type: 'string',
              example: 'en',
              description: 'Work language'
            },
            document_type: {
              type: 'string',
              example: 'BOOK',
              description: 'Document type'
            },
            author_count: {
              type: 'integer',
              example: 2,
              description: 'Number of authors'
            },
            authors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['John Smith', 'Jane Doe'],
              description: 'Author names'
            },
            instructors: {
              type: 'string',
              example: 'Bruce Corrie; Roque de Barros Laraia',
              description: 'Course instructors'
            }
          }
        },
        CoursesStatistics: {
          type: 'object',
          properties: {
            total_courses: {
              type: 'integer',
              example: 433,
              description: 'Total number of courses'
            },
            programs_count: {
              type: 'integer',
              example: 15,
              description: 'Number of programs'
            },
            earliest_year: {
              type: 'integer',
              example: 1968,
              description: 'Earliest academic year'
            },
            latest_year: {
              type: 'integer',
              example: 2024,
              description: 'Latest academic year'
            },
            semesters_count: {
              type: 'integer',
              example: 3,
              description: 'Number of distinct semesters'
            },
            avg_credits: {
              type: 'number',
              format: 'float',
              example: 3.5,
              description: 'Average credits per course'
            },
            courses_with_credits: {
              type: 'integer',
              example: 285,
              description: 'Courses with credit information'
            },
            year_distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: {
                    type: 'integer',
                    example: 2024
                  },
                  course_count: {
                    type: 'integer',
                    example: 45
                  },
                  program_count: {
                    type: 'integer',
                    example: 8
                  }
                }
              },
              description: 'Course distribution by year'
            },
            semester_distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  semester: {
                    type: 'string',
                    example: '2'
                  },
                  course_count: {
                    type: 'integer',
                    example: 200
                  }
                }
              },
              description: 'Course distribution by semester'
            }
          }
        },
        InstructorsStatistics: {
          type: 'object',
          properties: {
            total_instructors: {
              type: 'integer',
              example: 285,
              description: 'Total number of instructors'
            },
            total_courses_taught: {
              type: 'integer',
              example: 433,
              description: 'Total courses taught'
            },
            programs_with_instructors: {
              type: 'integer',
              example: 15,
              description: 'Programs with instructors'
            },
            avg_courses_per_instructor: {
              type: 'number',
              format: 'float',
              example: 2.8,
              description: 'Average courses per instructor'
            },
            role_distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    example: 'PROFESSOR'
                  },
                  instructor_count: {
                    type: 'integer',
                    example: 250
                  },
                  assignment_count: {
                    type: 'integer',
                    example: 400
                  }
                }
              },
              description: 'Distribution by role'
            },
            top_instructors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  preferred_name: {
                    type: 'string',
                    example: 'John Smith'
                  },
                  courses_taught: {
                    type: 'integer',
                    example: 25
                  },
                  programs_count: {
                    type: 'integer',
                    example: 3
                  },
                  earliest_year: {
                    type: 'integer',
                    example: 1970
                  },
                  latest_year: {
                    type: 'integer',
                    example: 2024
                  }
                }
              },
              description: 'Top instructors by course count'
            }
          }
        },
        SubjectsStatistics: {
          type: 'object',
          properties: {
            total_subjects: {
              type: 'integer',
              example: 42822,
              description: 'Total number of subjects'
            },
            root_subjects: {
              type: 'integer',
              example: 35000,
              description: 'Root subjects (no parent)'
            },
            child_subjects: {
              type: 'integer',
              example: 7822,
              description: 'Child subjects (have parent)'
            },
            vocabularies_count: {
              type: 'integer',
              example: 6,
              description: 'Number of vocabularies'
            },
            subjects_with_works: {
              type: 'integer',
              example: 38500,
              description: 'Subjects associated with works'
            },
            total_work_subject_relations: {
              type: 'integer',
              example: 74338,
              description: 'Total work-subject relationships'
            },
            vocabulary_distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  vocabulary: {
                    type: 'string',
                    example: 'KEYWORD'
                  },
                  subject_count: {
                    type: 'integer',
                    example: 40000
                  },
                  root_count: {
                    type: 'integer',
                    example: 32000
                  },
                  works_count: {
                    type: 'integer',
                    example: 65000
                  }
                }
              },
              description: 'Distribution by vocabulary'
            },
            top_subjects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  term: {
                    type: 'string',
                    example: 'Anthropology'
                  },
                  vocabulary: {
                    type: 'string',
                    example: 'KEYWORD'
                  },
                  works_count: {
                    type: 'integer',
                    example: 1500
                  },
                  courses_count: {
                    type: 'integer',
                    example: 25
                  },
                  avg_relevance: {
                    type: 'number',
                    format: 'float',
                    example: 0.85
                  }
                }
              },
              description: 'Top subjects by work count'
            }
          }
        },
        BibliographyStatistics: {
          type: 'object',
          properties: {
            total_bibliography_entries: {
              type: 'integer',
              example: 17003,
              description: 'Total bibliography entries'
            },
            unique_works: {
              type: 'integer',
              example: 12500,
              description: 'Unique works in bibliographies'
            },
            courses_with_bibliography: {
              type: 'integer',
              example: 380,
              description: 'Courses with bibliography'
            },
            programs_with_bibliography: {
              type: 'integer',
              example: 15,
              description: 'Programs with bibliography'
            },
            avg_works_per_course: {
              type: 'number',
              format: 'float',
              example: 45.8,
              description: 'Average works per course'
            },
            max_works_per_course: {
              type: 'integer',
              example: 250,
              description: 'Maximum works in a course'
            },
            reading_type_distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reading_type: {
                    type: 'string',
                    example: 'RECOMMENDED'
                  },
                  count: {
                    type: 'integer',
                    example: 15000
                  },
                  percentage: {
                    type: 'number',
                    format: 'float',
                    example: 88.2
                  }
                }
              },
              description: 'Distribution by reading type'
            },
            year_range: {
              type: 'object',
              properties: {
                earliest_course_year: {
                  type: 'integer',
                  example: 1968
                },
                latest_course_year: {
                  type: 'integer',
                  example: 2024
                },
                earliest_publication_year: {
                  type: 'integer',
                  example: 1850
                },
                latest_publication_year: {
                  type: 'integer',
                  example: 2024
                },
                avg_publication_year: {
                  type: 'number',
                  format: 'float',
                  example: 1985.5
                }
              },
              description: 'Year range information'
            }
          }
        },
        BibliographyAnalysis: {
          type: 'object',
          properties: {
            most_used_works: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    example: 2690411
                  },
                  title: {
                    type: 'string',
                    example: 'Comparative Political Institutions'
                  },
                  publication_year: {
                    type: 'integer',
                    example: 1965
                  },
                  document_type: {
                    type: 'string',
                    example: 'BOOK'
                  },
                  author_count: {
                    type: 'integer',
                    example: 2
                  },
                  authors: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    example: ['John Smith', 'Jane Doe']
                  },
                  used_in_courses: {
                    type: 'integer',
                    example: 15
                  },
                  used_in_programs: {
                    type: 'integer',
                    example: 5
                  },
                  reading_types: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    example: ['REQUIRED', 'RECOMMENDED']
                  }
                }
              },
              description: 'Most frequently used works'
            },
            trends_by_year: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  year: {
                    type: 'integer',
                    example: 2023
                  },
                  works_count: {
                    type: 'integer',
                    example: 850
                  },
                  courses_count: {
                    type: 'integer',
                    example: 35
                  },
                  programs_count: {
                    type: 'integer',
                    example: 8
                  },
                  avg_publication_year: {
                    type: 'number',
                    format: 'float',
                    example: 1995.5
                  }
                }
              },
              description: 'Bibliography trends by year'
            },
            reading_type_distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reading_type: {
                    type: 'string',
                    example: 'RECOMMENDED'
                  },
                  count: {
                    type: 'integer',
                    example: 15000
                  },
                  unique_works: {
                    type: 'integer',
                    example: 8500
                  },
                  courses: {
                    type: 'integer',
                    example: 350
                  }
                }
              },
              description: 'Distribution by reading type'
            },
            document_type_distribution: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  document_type: {
                    type: 'string',
                    example: 'BOOK'
                  },
                  usage_count: {
                    type: 'integer',
                    example: 8500
                  },
                  unique_works: {
                    type: 'integer',
                    example: 3200
                  },
                  courses_count: {
                    type: 'integer',
                    example: 280
                  }
                }
              },
              description: 'Distribution by document type'
            }
          }
        },
        InstructorBibliography: {
          type: 'object',
          properties: {
            work_id: {
              type: 'integer',
              example: 2684644,
              description: 'Work identifier'
            },
            title: {
              type: 'string',
              example: 'The Gift: Forms and Functions of Exchange in Archaic Societies',
              description: 'Work title'
            },
            publication_year: {
              type: 'integer',
              example: 1950,
              description: 'Year of publication'
            },
            language: {
              type: 'string',
              example: 'en',
              description: 'Publication language'
            },
            document_type: {
              type: 'string',
              enum: ['ARTICLE', 'BOOK', 'CHAPTER', 'THESIS', 'REPORT'],
              example: 'BOOK',
              description: 'Type of document'
            },
            reading_type: {
              type: 'string',
              enum: ['REQUIRED', 'RECOMMENDED', 'SUPPLEMENTARY', 'OPTIONAL'],
              example: 'RECOMMENDED',
              description: 'Reading assignment type'
            },
            author_count: {
              type: 'integer',
              example: 1,
              description: 'Number of authors'
            },
            first_author_name: {
              type: 'string',
              example: 'Marcel Mauss',
              description: 'First author name'
            },
            authors: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Marcel Mauss'],
              description: 'List of authors'
            },
            used_in_courses: {
              type: 'integer',
              example: 3,
              description: 'Number of courses using this work'
            }
          },
          description: 'Bibliography entry used by instructor'
        },
        WorkBibliography: {
          type: 'object',
          properties: {
            course_id: {
              type: 'integer',
              example: 465,
              description: 'Course identifier'
            },
            course_name: {
              type: 'string',
              example: 'Antropologia do Parentesco',
              description: 'Course name'
            },
            course_year: {
              type: 'integer',
              example: 2025,
              description: 'Academic year'
            },
            program_id: {
              type: 'integer',
              example: 2,
              description: 'Academic program identifier'
            },
            reading_type: {
              type: 'string',
              enum: ['REQUIRED', 'RECOMMENDED', 'SUPPLEMENTARY', 'OPTIONAL'],
              example: 'RECOMMENDED',
              description: 'Reading assignment type'
            },
            instructor_count: {
              type: 'integer',
              example: 2,
              description: 'Number of instructors'
            },
            instructors: {
              type: 'string',
              example: 'João Silva; Maria Santos',
              description: 'Instructor names (semicolon separated)'
            }
          },
          description: 'Course usage information for a work'
        },
        ComprehensiveInstructorProfile: {
          type: 'object',
          properties: {
            person: {
              type: 'object',
              properties: {
                id: {
                  type: 'integer',
                  example: 1
                },
                preferred_name: {
                  type: 'string',
                  example: 'Luiz Fernando Dias Duarte'
                },
                given_names: {
                  type: 'string',
                  example: 'Luiz Fernando Dias'
                },
                family_name: {
                  type: 'string',
                  example: 'Duarte'
                },
                name_variations: {
                  type: 'string',
                  example: '{"original": "Luiz Fernando Dias Duarte", "normalized": "Luiz Fernando Dias Duarte"}'
                },
                orcid: {
                  type: 'string',
                  example: '0000-0001-7610-1527'
                },
                lattes_id: {
                  type: 'string',
                  nullable: true,
                  example: null
                },
                scopus_id: {
                  type: 'string',
                  nullable: true,
                  example: null
                },
                is_verified: {
                  type: 'integer',
                  example: 1
                },
                created_at: {
                  type: 'string',
                  format: 'date-time',
                  example: '2025-08-13T22:29:24.000Z'
                }
              },
              description: 'Complete person information'
            },
            teaching_profile: {
              type: 'object',
              properties: {
                courses_taught: {
                  type: 'integer',
                  example: 29
                },
                programs_count: {
                  type: 'integer',
                  example: 1
                },
                bibliography_items_used: {
                  type: 'integer',
                  example: 1018
                },
                unique_collaborators: {
                  type: 'integer',
                  example: 1
                },
                teaching_start_year: {
                  type: 'integer',
                  example: 1981
                },
                teaching_end_year: {
                  type: 'integer',
                  example: 2022
                },
                teaching_roles: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['PROFESSOR', 'ASSISTANT', 'TA', 'GUEST']
                  },
                  example: ['PROFESSOR']
                },
                teaching_span_years: {
                  type: 'integer',
                  example: 42
                }
              },
              description: 'Teaching career statistics and timeline'
            },
            authorship_profile: {
              type: 'object',
              properties: {
                works_authored: {
                  type: 'integer',
                  example: 25
                },
                unique_signatures: {
                  type: 'integer',
                  example: 1
                },
                confirmed_authorships: {
                  type: 'integer',
                  example: 38
                },
                first_publication_year: {
                  type: 'integer',
                  nullable: true,
                  example: 1971
                },
                latest_publication_year: {
                  type: 'integer',
                  nullable: true,
                  example: 2022
                }
              },
              description: 'Research output and authorship statistics'
            },
            signatures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    example: 92152
                  },
                  signature: {
                    type: 'string',
                    example: 'DUARTE L F D'
                  },
                  works_with_signature: {
                    type: 'integer',
                    example: 25
                  }
                }
              },
              description: 'Author signatures and their usage in works'
            },
            recent_authored_works: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    example: 2683933
                  },
                  title: {
                    type: 'string',
                    example: 'Un nouveau centenaire pour le Brésil et pour son Musée National'
                  },
                  year: {
                    type: 'integer',
                    example: 2022
                  },
                  work_type: {
                    type: 'string',
                    example: 'ARTICLE'
                  },
                  language: {
                    type: 'string',
                    nullable: true,
                    example: null
                  },
                  signature_text: {
                    type: 'string',
                    example: 'DUARTE L F D'
                  }
                }
              },
              description: '10 most recent authored works by publication year'
            },
            bibliography_usage_patterns: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reading_type: {
                    type: 'string',
                    enum: ['REQUIRED', 'RECOMMENDED', 'SUPPLEMENTARY'],
                    example: 'RECOMMENDED'
                  },
                  works_count: {
                    type: 'integer',
                    example: 1018
                  },
                  courses_count: {
                    type: 'integer',
                    example: 29
                  }
                }
              },
              description: 'Bibliography usage patterns in courses taught'
            },
            most_used_authors_in_courses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  author_string: {
                    type: 'string',
                    example: 'Marcel Mauss;Claude Lévi-Strauss'
                  },
                  first_author_name: {
                    type: 'string',
                    example: 'Marcel Mauss'
                  },
                  usage_count: {
                    type: 'integer',
                    example: 15
                  },
                  courses_count: {
                    type: 'integer',
                    example: 8
                  },
                  authors_array: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    example: ['Marcel Mauss', 'Claude Lévi-Strauss']
                  }
                }
              },
              description: '15 most frequently used authors in instructor courses'
            },
            subject_expertise: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  vocabulary: {
                    type: 'string',
                    enum: ['KEYWORD', 'MESH', 'LCSH', 'DDC', 'UDC', 'CUSTOM'],
                    example: 'KEYWORD'
                  },
                  subjects_count: {
                    type: 'integer',
                    example: 45
                  },
                  works_count: {
                    type: 'integer',
                    example: 120
                  },
                  courses_count: {
                    type: 'integer',
                    example: 15
                  }
                }
              },
              description: 'Subject expertise analysis by vocabulary type'
            },
            teaching_collaborators: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  collaborator_id: {
                    type: 'integer',
                    example: 6
                  },
                  collaborator_name: {
                    type: 'string',
                    example: 'Adriana Vianna'
                  },
                  shared_courses: {
                    type: 'integer',
                    example: 1
                  }
                }
              },
              description: 'Top 10 teaching collaborators by shared courses'
            },
            combined_statistics: {
              type: 'object',
              properties: {
                total_academic_span_years: {
                  type: 'integer',
                  example: 52,
                  description: 'Maximum span between teaching and publication activities'
                },
                academic_productivity_ratio: {
                  type: 'string',
                  example: '0.86',
                  description: 'Ratio of works authored to courses taught'
                },
                bibliography_diversity_score: {
                  type: 'integer',
                  example: 1,
                  description: 'Number of different reading types used'
                },
                signature_consistency_score: {
                  type: 'number',
                  example: 25,
                  description: 'Average works per signature (consistency measure)'
                }
              },
              description: 'Combined academic performance metrics'
            }
          },
          description: 'Comprehensive academic profile combining teaching, research, authorship, and collaboration data'
        },
        ComprehensiveCourseDetails: {
          type: 'object',
          properties: {
            course: {
              $ref: '#/components/schemas/CourseDetails',
              description: 'Basic course information'
            },
            bibliography: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  course_id: {
                    type: 'integer',
                    example: 25
                  },
                  work_id: {
                    type: 'integer',
                    example: 2715248
                  },
                  reading_type: {
                    type: 'string',
                    enum: ['REQUIRED', 'RECOMMENDED', 'SUPPLEMENTARY'],
                    example: 'RECOMMENDED'
                  },
                  week_number: {
                    type: 'integer',
                    nullable: true,
                    example: 3
                  },
                  notes: {
                    type: 'string',
                    nullable: true,
                    example: 'Essential reading for module introduction'
                  },
                  title: {
                    type: 'string',
                    example: 'Changing Emphases in Social Structure'
                  },
                  publication_year: {
                    type: 'integer',
                    nullable: true,
                    example: 1965
                  },
                  language: {
                    type: 'string',
                    nullable: true,
                    example: 'en'
                  },
                  document_type: {
                    type: 'string',
                    example: 'ARTICLE'
                  },
                  author_string: {
                    type: 'string',
                    example: 'George Peter Murdock'
                  },
                  first_author_name: {
                    type: 'string',
                    example: 'George Peter Murdock'
                  },
                  authors: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    example: ['George Peter Murdock']
                  },
                  author_count: {
                    type: 'integer',
                    example: 1
                  }
                }
              },
              description: 'Course bibliography with detailed work information'
            },
            instructors: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CourseInstructor'
              },
              description: 'Course instructors with roles and verification'
            },
            subjects: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'integer',
                    example: 1
                  },
                  term: {
                    type: 'string',
                    example: 'Anthropology'
                  },
                  vocabulary: {
                    type: 'string',
                    enum: ['KEYWORD', 'MESH', 'LCSH', 'DDC', 'UDC', 'CUSTOM'],
                    example: 'KEYWORD'
                  },
                  parent_id: {
                    type: 'integer',
                    nullable: true,
                    example: null
                  },
                  work_count: {
                    type: 'integer',
                    example: 15,
                    description: 'Number of works in this course using this subject'
                  }
                }
              },
              description: 'Subjects covered in course bibliography'
            },
            statistics: {
              type: 'object',
              properties: {
                total_bibliography_items: {
                  type: 'integer',
                  example: 17,
                  description: 'Total bibliography entries'
                },
                total_instructors: {
                  type: 'integer',
                  example: 2,
                  description: 'Total number of instructors'
                },
                total_subjects: {
                  type: 'integer',
                  example: 0,
                  description: 'Total number of subjects covered'
                }
              },
              description: 'Course statistical summary'
            },
            bibliography_statistics: {
              type: 'object',
              properties: {
                by_type: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      count: {
                        type: 'integer',
                        example: 17
                      },
                      first_week: {
                        type: 'integer',
                        nullable: true,
                        example: null
                      },
                      last_week: {
                        type: 'integer',
                        nullable: true,
                        example: null
                      }
                    }
                  },
                  example: {
                    'RECOMMENDED': {
                      'count': 17,
                      'first_week': null,
                      'last_week': null
                    }
                  },
                  description: 'Bibliography statistics by reading type'
                },
                by_week: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      week_number: {
                        type: 'integer',
                        example: 1
                      },
                      count: {
                        type: 'integer',
                        example: 3
                      },
                      reading_types: {
                        type: 'string',
                        example: 'REQUIRED,RECOMMENDED'
                      }
                    }
                  },
                  description: 'Bibliography distribution by week'
                }
              },
              description: 'Detailed bibliography statistics'
            },
            instructor_statistics: {
              type: 'object',
              properties: {
                by_role: {
                  type: 'object',
                  additionalProperties: {
                    type: 'integer'
                  },
                  example: {
                    'PROFESSOR': 2
                  },
                  description: 'Instructor count by role'
                }
              },
              description: 'Instructor distribution statistics'
            },
            subject_statistics: {
              type: 'object',
              properties: {
                by_vocabulary: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      unique_subjects: {
                        type: 'integer',
                        example: 15
                      },
                      works_covered: {
                        type: 'integer',
                        example: 12
                      }
                    }
                  },
                  example: {
                    'KEYWORD': {
                      'unique_subjects': 15,
                      'works_covered': 12
                    }
                  },
                  description: 'Subject statistics by vocabulary'
                }
              },
              description: 'Subject coverage statistics'
            }
          },
          description: 'Comprehensive course details with bibliography, instructors, subjects, and statistics'
        }
      },
      parameters: {
        limitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items to return per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        offsetParam: {
          name: 'offset',
          in: 'query',
          description: 'Number of items to skip',
          required: false,
          schema: {
            type: 'integer',
            minimum: 0,
            default: 0
          }
        },
        pageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number (1-based)',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        searchParam: {
          name: 'search',
          in: 'query',
          description: 'Search term for filtering results',
          required: false,
          schema: {
            type: 'string',
            minLength: 2,
            maxLength: 255
          }
        },
        yearFromParam: {
          name: 'year_from',
          in: 'query',
          description: 'Filter by minimum publication year',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1900,
            maximum: 2030
          }
        },
        yearToParam: {
          name: 'year_to',
          in: 'query',
          description: 'Filter by maximum publication year',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1900,
            maximum: 2030
          }
        }
      },
      responses: {
        Success: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        BadRequest: {
          description: 'Bad request - Invalid input parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Invalid venue ID',
                code: 'VALIDATION_ERROR'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Resource not found',
                code: 'NOT_FOUND'
              }
            }
          }
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Internal server error',
                code: 'INTERNAL_ERROR'
              }
            }
          }
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded - Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Rate limit exceeded. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED'
              }
            }
          }
        },
        Forbidden: {
          description: 'Access forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                status: 'error',
                message: 'Access forbidden',
                code: 'FORBIDDEN'
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'success'
            },
            data: {
              description: 'Response data - varies by endpoint'
            },
            pagination: {
              $ref: '#/components/schemas/PaginationMeta',
              description: 'Pagination metadata (for paginated responses only)'
            }
          },
          required: ['status', 'data']
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              example: 6894,
              description: 'Total number of results'
            },
            limit: {
              type: 'integer',
              example: 20,
              description: 'Number of results per page'
            },
            offset: {
              type: 'integer',
              example: 0,
              description: 'Number of results skipped'
            },
            pages: {
              type: 'integer',
              example: 345,
              description: 'Total number of pages'
            },
            hasNext: {
              type: 'boolean',
              example: true,
              description: 'Whether there is a next page'
            },
            hasPrev: {
              type: 'boolean',
              example: false,
              description: 'Whether there is a previous page'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'System health monitoring and status endpoints. Check API availability, performance metrics, and service dependencies. PUBLIC ACCESS - No limits',
        externalDocs: {
          description: 'Monitoring Guide',
          url: 'https://ethnos.app/docs/monitoring'
        }
      },
      {
        name: 'Security',
        description: 'Security monitoring and IP management endpoints. View rate limiting stats, blocked IPs, and security metrics. Rate limit: 30 requests/minute',
        externalDocs: {
          description: 'Security Guide',
          url: 'https://ethnos.app/docs/security'
        }
      },
      {
        name: 'Works',
        description: 'Academic works and publications. Access comprehensive bibliographic data including papers, books, theses, and conference proceedings. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Works API Guide',
          url: 'https://ethnos.app/docs/works'
        }
      },
      {
        name: 'Persons',
        description: 'Researchers and authors. Access author profiles, institutional affiliations, and academic identities. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Persons API Guide',
          url: 'https://ethnos.app/docs/persons'
        }
      },
      {
        name: 'Organizations',
        description: 'Academic institutions and organizations. Access data about universities, research institutes, companies, and government organizations. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Organizations API Guide',
          url: 'https://ethnos.app/docs/organizations'
        }
      },
      {
        name: 'Search',
        description: 'High-performance search and discovery endpoints. Advanced Sphinx search engine delivering 221x performance improvement with full-text search, relevance scoring, and comprehensive filtering across all academic entities. PUBLIC ACCESS - Rate limit: 20 requests/minute',
        externalDocs: {
          description: 'Search API Guide',
          url: 'https://ethnos.app/docs/search'
        }
      },
      {
        name: 'Citations',
        description: 'Citation analysis and bibliometric relationships. Explore citation networks, impact metrics, and reference relationships between works. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Citations API Guide',
          url: 'https://ethnos.app/docs/citations'
        }
      },
      {
        name: 'Collaborations',
        description: 'Research collaboration networks and partnerships. Analyze co-authorship patterns, research networks, and collaborative relationships. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Collaborations API Guide',
          url: 'https://ethnos.app/docs/collaborations'
        }
      },
      {
        name: 'Metrics',
        description: 'Statistical analysis and bibliometric indicators. Access comprehensive analytics, trends, and institutional productivity metrics. PUBLIC ACCESS - Rate limit: 30 requests/minute',
        externalDocs: {
          description: 'Metrics API Guide',
          url: 'https://ethnos.app/docs/metrics'
        }
      },
      {
        name: 'Files',
        description: 'File management and metadata operations. Access document files, metadata, and download statistics for academic publications. PUBLIC ACCESS - Rate limit: 10 downloads/minute',
        externalDocs: {
          description: 'Files API Guide',
          url: 'https://ethnos.app/docs/files'
        }
      },
      {
        name: 'Venues',
        description: 'Academic venues and publication platforms. Access data about journals, conferences, repositories, and book series where academic works are published. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Venues API Guide',
          url: 'https://ethnos.app/docs/venues'
        }
      },
      {
        name: 'Signatures',
        description: 'Name signatures and author identification. Access author name variants and signatures for improved author disambiguation and name matching. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Signatures API Guide',
          url: 'https://ethnos.app/docs/signatures'
        }
      },
      {
        name: 'Dashboard',
        description: 'Real-time analytics dashboard for search performance and system metrics'
      },
      {
        name: 'Courses',
        description: 'Academic courses and curriculum management. Access course information, instructors, bibliography, and subject coverage. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Courses API Guide',
          url: 'https://ethnos.app/docs/courses'
        }
      },
      {
        name: 'Instructors',
        description: 'Course instructors and teaching activities. Access instructor profiles, teaching history, and academic expertise based on course assignments. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Instructors API Guide',
          url: 'https://ethnos.app/docs/instructors'
        }
      },
      {
        name: 'Subjects',
        description: 'Subject classification and hierarchical navigation. Access controlled vocabularies, subject hierarchies, and topic-based filtering across academic content. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Subjects API Guide',
          url: 'https://ethnos.app/docs/subjects'
        }
      },
      {
        name: 'Bibliography',
        description: 'Academic bibliography and reading lists. Access course reading assignments, bibliography analysis, and work usage patterns across academic programs. PUBLIC ACCESS - Rate limit: 100 requests/minute',
        externalDocs: {
          description: 'Bibliography API Guide',
          url: 'https://ethnos.app/docs/bibliography'
        }
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
