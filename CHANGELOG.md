# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-01-26

### Added

- Initial release of @okrlinkhub/okrhub Convex component
- Support for syncing Objectives, Key Results, Risks, Initiatives, Indicators, and Milestones
- HMAC-SHA256 authentication for secure API communication
- Queue-based async processing with retry logic
- External ID system for mapping entities between apps
- HTTP routes support for REST API access
- React hooks for client-side integration
- TypeScript types and validators for all entity payloads
- Comprehensive documentation and example app

### Features

- One-way sync from external apps to LinkHub
- Company isolation via API key scoping
- Automatic ID mapping between external and internal IDs
- Batch processing with configurable batch sizes
- Error handling and retry mechanisms
- Queue state tracking (pending, processing, success, failed)

## [0.0.0] - Initial

- Initial project setup
