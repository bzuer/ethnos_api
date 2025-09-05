# Declaration of Artificial Intelligence Utilization

## 1. Project Overview

- **Project**: Ethnos.app Academic Bibliographic API
- **Version**: 2.0.0
- **Declaration Date**: 2025-09-03
- **Purpose**: This document provides full transparency regarding the integration of AI-powered tools as assistive components within the software development lifecycle (SDLC). It establishes clear ethical guidelines and affirms ultimate human accountability for all aspects of the project.

## 2. Guiding Principles

### AI as an Augmentation Tool
AI assistants were employed to enhance developer productivity, code quality, and implementation speed. They served as advanced tools that complemented, but did not replace, human critical thinking, architectural design, or final decision-making.

### Absolute Human Accountability
The final responsibility for all source code, system architecture, security posture, and operational functionality resides exclusively with the human developer.

### Full Transparency
This document serves as a comprehensive and transparent log detailing the scope, methodology, and specific contributions of AI tools throughout the development process.

## 3. AI Tooling and Methodology

### 3.1. AI Assistants Utilized

This project employed a multi-model strategy, leveraging the distinct strengths of various AI assistants for different tasks.

#### Primary Development & Reasoning Assistant: Anthropic Claude (Pro)
- **Primary Role**: Served as the core "pair programmer" for complex code implementation, advanced algorithmic problem-solving, in-depth debugging, and security analysis.
- **Scope of Use**: Source code generation (Node.js, SQL), logic refactoring, architectural suggestions, and generation of comprehensive technical documentation.
- **Integration**: Used via the official web interface for extended, context-rich interactions.

#### Secondary Research & Architecture Assistant: Google Gemini (Student Edition)
- **Primary Role**: Acted as a "technical consultant" for broad architectural research, validation of design patterns, and exploration of alternative technological approaches.
- **Scope of Use**: High-level architectural validation, comparative analysis of software libraries and paradigms, and brainstorming solutions to complex, non-obvious technical challenges.
- **Integration**: Accessed via the Google AI Studio web interface.

#### Tertiary Assistants for Review and Ideation:
- **DeepSeek Chat (Free Version)**: Utilized for rapid code snippet generation, syntax verification, and as a secondary opinion for logic validation on discrete tasks.
- **xAI Grok (Free Version)**: Employed for initial brainstorming, generating alternative implementation ideas, and high-level explanatory text.

### 3.2. AI-Assisted Development Patterns

AI assistance was strategically leveraged across four primary domains, guided by specific, context-rich technical prompts:

#### Code & Logic Generation
**Example Prompts:**
- "Refactor this Express.js controller to use async/await syntax, implement a centralized error handling middleware, and add comprehensive JSDoc annotations compatible with OpenAPI generation."
- "Generate a robust Node.js module for a secure MariaDB connection pool using the 'mysql2/promise' library, configured dynamically via environment variables and adhering to the 12-factor app methodology."

#### Security Implementation
**Example Prompts:**
- "Conduct a security analysis of this authentication module. Identify potential vulnerabilities, including timing attacks in the password comparison function, and provide a corrected, constant-time implementation. Also, generate a strict Content Security Policy (CSP) for the Swagger UI endpoint."
- "Create a complete express-validator schema to sanitize and validate all input parameters for the academic search API endpoint. Ensure strong typing and include protections against common injection patterns."

#### Performance Optimization
**Example Prompts:**
- "Design an optimized Sphinx full-text search index schema to support faceted search on academic metadata (author, year, keywords). Provide the corresponding SphinxQL query for a multi-filter search that includes relevance weighting and result aggregation."
- "Implement a production-ready Redis caching layer for the main search endpoint. Include a 30-minute TTL, cache invalidation strategies, and a stale-while-revalidate mechanism to ensure high availability under load."

#### Documentation Generation
**Example Prompts:**
- "Parse the JSDoc annotations from these Express.js route handlers and generate a complete OpenAPI 3.0.1 specification in YAML. Include detailed schema definitions for all request bodies and documented HTTP response codes."
- "Generate technical documentation in Markdown for the defined database schema, including an entity-relationship diagram (ERD) described in Mermaid syntax."

## 4. Human Oversight and Validation Protocol

All AI-generated output was subjected to a rigorous, multi-stage human validation protocol before integration:

### 1. Critical Analysis & Review
100% of AI-suggested code, architecture, and documentation was critically evaluated by the developer for correctness, efficiency, and adherence to project standards. This often involved direct comparison and benchmarking against established best practices.

### 2. Architectural Governance
AI-provided architectural suggestions were treated as input for a formal decision-making process. The final system architecture, database schema, and security policies were designed, evaluated, and exclusively approved by the human developer.

### 3. Security Audits
In addition to AI-assisted analysis, manual security reviews and automated vulnerability scanning (e.g., using `npm audit`, Snyk) were performed. All security-sensitive configurations (e.g., credentials, cryptographic keys, environment variables) were managed exclusively by the developer without AI interaction.

### 4. Testing & Validation
A comprehensive test suite (unit, integration, and end-to-end tests) was authored and executed by the developer. Load testing was performed to empirically validate all AI-suggested performance optimizations under production-like conditions.

## 5. System Architecture & Technology Stack

The project is built on a modern, performance-oriented technology stack. AI tools assisted in the implementation and configuration of its core components:

- **Backend Runtime**: Node.js, Express.js
- **Database Layer**:
  - MariaDB (Primary Relational Data Store)
  - Redis (Caching & Session Management)
  - Sphinx (High-Performance Full-Text Search Engine)
- **Security Middleware**: Helmet.js, express-rate-limit, express-validator, `xss` library
- **API Documentation**: OpenAPI 3.0.1 (Automatically generated via Swagger-jsdoc, served by Swagger-ui-express)

A complete and version-locked list of all software dependencies is maintained in the project's `package.json` and `composer.json` files, ensuring reproducibility and software supply chain security.

## 6. Intellectual Property and Attribution

### AI Contributions (Assistance)
It is estimated that AI tools assisted in the drafting, refactoring, or optimization of approximately 60-70% of the codebase. The majority of technical documentation and configuration files were also initially drafted with AI assistance.

### Human Contributions (Authorship & Accountability)
The human developer retains full authorship and is solely accountable for:
- The core API and system design
- Business logic and academic domain modeling
- Final validation, testing, and approval of all code
- Deployment strategy and operational management
- The curation and integrity of the academic bibliographic data.

### Original Content
The academic bibliographic data is sourced from legitimate, authoritative databases. The overall system architecture synthesizes established industry best practices for building scalable, secure RESTful APIs.

## 7. Compliance and Ethics

### Data Privacy and Security
No sensitive user data, personal information (PII), or proprietary business logic was disclosed to any AI model. All interactions were strictly limited to non-sensitive code, architecture patterns, and technical concepts.

### Professional Standards
The project adheres to high professional standards for code quality, documentation, and security. AI was leveraged as a tool to help achieve and maintain these standards more efficiently, not to circumvent them.

## 8. Verification and Accountability

The complete development history, including every iteration of code and documentation, is transparently maintained in the project's git version control system. Each commit represents a discrete, validated unit of work overseen by the human developer, who bears final accountability for the entire software product.

## 9. Technical Complexity Assessment

### System Architecture Complexity
- **Integrated Data Services**: 4 distinct systems (MariaDB, Redis, Sphinx, filesystem) working in concert.
- **Search Engine Implementation**: Custom, optimized Sphinx configuration with real-time indexing from MariaDB.
- **Performance Optimization**: Multiple significant (100x+) performance improvements documented and validated.
- **Security Infrastructure**: Resolution of critical vulnerabilities identified through combined AI and manual audits.

### AI Contribution Analysis
- **Estimated AI-Assisted Code**: 60-70% of implementation code involved AI assistance in its creation or refinement.
- **Human Decision Points**: All architectural selections, business logic validation, and security policies were human-directed.
- **Validation Metrics**: The majority of AI suggestions were accepted only after rigorous human review and testing.
- **Modification Rate**: Approximately 15% of AI-proposed code required significant human adjustment before integration.

## 10. Risk Assessment and Mitigation

### Technical Risks Identified and Mitigated
- **Over-reliance on AI**: Mitigated through a strict protocol of critical review, testing, and the maintenance of full system understanding by the developer.
- **Code Quality Degradation**: Addressed through adherence to style guides, static analysis, and mandatory code review against professional standards.
- **Security Vulnerabilities**: Neutralized through a multi-layered audit process combining AI analysis, automated scanning, and manual review (7 critical issues were identified and resolved).
- **Performance Assumptions**: All performance-related suggestions were empirically validated through benchmarking and load testing before implementation.

### Ongoing Monitoring and Maintenance
- **Code Maintenance**: The human developer maintains a comprehensive understanding of the entire system for effective long-term maintenance.
- **Security Updates**: Regular manual security reviews and dependency updates are conducted independent of AI assistance.
- **Performance Monitoring**: Real-time performance metrics are monitored, with human interpretation guiding all optimization decisions.

## 11. Funding and Financial Disclosure

### Project Funding Declaration
This project was developed without any external funding, sponsorships, grants, or financial support from public or private institutions, companies, or organizations. The project represents independent academic research conducted as part of doctoral studies.

### Developer Financial Status
The developer maintains exclusive dedication to doctoral research activities, supported by a CNPq (Brazilian National Council for Scientific and Technological Development) doctoral scholarship requiring full-time commitment, with a monthly stipend of approximately USD 566.84 (BRL 3,100.00 as of September 2025).

### Infrastructure and Resources
All computational resources, software licenses, and hosting services utilized in this project were either:
- Free and open-source software (FOSS)
- Academic/student licenses provided at no cost
- Funded by personal resources within the constraints of the doctoral scholarship

### Conflict of Interest Statement
There are no financial conflicts of interest to declare. The project maintains complete independence from commercial interests and represents solely academic research objectives.

## Declaration Maintainer & Project Lead

- **Developer**: Bruno Cesar Cunha Cruz, PhD Student
- **ORCID**: [0000-0001-8652-2333](https://orcid.org/0000-0001-8652-2333)
- **Institution**: PPGAS/MN/UFRJ (Graduate Program in Social Anthropology, National Museum, Federal University of Rio de Janeiro)
- **Funding**: CNPq Doctoral Scholarship (Exclusive Dedication)
- **Project**: Ethnos.app Academic Bibliography System
- **Website**: [https://ethnos.app](https://ethnos.app)

**Last Updated**: 2025-09-03

[![DOI](https://zenodo.org/badge/1049971688.svg)](https://doi.org/10.5281/zenodo.17049435)
