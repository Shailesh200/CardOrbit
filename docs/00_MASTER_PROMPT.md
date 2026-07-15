# CardWise

The intelligent operating system for managing your credit cards.

Internal Project Name:
cardwise

# MASTER PROMPT
## Part 1 of 4 — Vision, Product Foundation, Architecture & Engineering Principles

> **Purpose**
>
> This document is the master source of truth for building the entire CardWise application inside Cursor.
>
> Cursor should use this document as the permanent context while implementing the application.
>
> This is **NOT** a prototype.
>
> Build production-ready software using scalable architecture, clean code, strong typing, excellent UX, high performance, accessibility, and enterprise engineering standards.
>
> Every future feature should extend this architecture instead of replacing it.

---

# Product Name

CardWise

Possible future branding:

- CardOS
- WalletOS
- CreditHub
- CardPilot
- CardStack
- Credit Command Center

The internal project name should remain:

```
credit-card-os
```

---

# Vision

Build the most advanced personal Credit Card Management Platform available.

Not merely a card tracking application.

Not a bill reminder.

Not another expense tracker.

The goal is to become the operating system for every credit card a person owns.

The application should intelligently manage:

- cards
- billing cycles
- due dates
- reward points
- lounge access
- milestones
- spending optimization
- reward maximization
- EMI tracking
- annual fee decisions
- statement analysis
- AI recommendations
- financial insights

Eventually the product should become an AI Financial Assistant specialized for credit cards.

---

# Core Philosophy

Users should never need spreadsheets.

Users should never manually calculate billing dates.

Users should never forget:

- due dates
- reward expiry
- milestone deadlines
- annual fee renewal
- card activation
- lounge quota

Everything should be automated.

---

# Product Goals

The application should help users:

1. Never miss a payment

2. Maximize every reward

3. Know which card to use

4. Reduce unnecessary fees

5. Increase credit score awareness

6. Optimize utilization

7. Analyze spending

8. Understand statements

9. Track card health

10. Receive proactive AI recommendations

---

# Long-Term Product Direction

The platform should eventually include:

- AI assistant
- OCR
- Statement parsing
- Email parsing
- SMS parsing
- Auto transaction import
- Bank integrations
- UPI integrations
- Expense intelligence
- Reward prediction
- Spending forecasts
- Family card management
- Shared wallets
- Business cards
- Investment integrations
- Loan integrations

The architecture should be designed today so these future capabilities can be added without major rewrites.

---

# Engineering Mindset

Build this exactly like a startup preparing for Series A funding.

Every decision should prioritize:

- maintainability
- scalability
- developer experience
- performance
- accessibility
- testing
- reliability
- observability
- security

Avoid shortcuts.

Avoid hacks.

Avoid temporary implementations.

---

# Target Users

Primary:

- Working professionals
- Credit card enthusiasts
- Reward optimizers
- Frequent travelers
- Families
- Premium card holders

Secondary:

- Students
- First-time credit card users
- Financial planners
- Accountants
- Small business owners

---

# Platforms

Phase 1

- Responsive Web Application (PWA)

Future

- Android
- iOS
- Desktop
- Browser Extension

The frontend architecture should make future clients straightforward to implement.

---

# Supported Regions

Initially:

India

Future:

- USA
- UK
- UAE
- Singapore
- Canada
- Australia
- Europe

Every monetary value, date, timezone, and locale should be designed with internationalization in mind.

---

# Product Principles

## Simplicity

Powerful features.

Simple interface.

---

## Automation

Reduce manual work.

Prefer automation whenever possible.

---

## Performance

Every interaction should feel instant.

---

## Intelligence

Recommend.

Predict.

Warn.

Explain.

Never just display data.

---

## Transparency

Always explain calculations.

Users should know why a recommendation exists.

---

# Design Principles

The UI should feel like a premium fintech product.

Inspired by:

- Apple Wallet
- Notion
- Linear
- Stripe Dashboard
- Arc Browser
- Revolut
- CRED
- Amex
- Monarch Money

Characteristics:

- spacious
- elegant
- fast
- modern
- subtle animations
- glassmorphism where appropriate
- clean typography
- excellent readability

Avoid visual clutter.

---

# Color Philosophy

Support:

- Light Theme
- Dark Theme

Future:

- Dynamic Themes
- Custom Accent Colors

Every component should support theming from day one.

---

# Accessibility

Target:

WCAG AA+

Requirements:

- keyboard navigation
- screen reader support
- color contrast compliance
- focus indicators
- semantic HTML
- ARIA where appropriate

Accessibility is mandatory.

---

# Performance Targets

Initial page load:

< 2 seconds

Largest Contentful Paint:

< 2.5 seconds

Interaction latency:

< 100ms

Time to Interactive:

Excellent

Bundle sizes should remain optimized.

---

# Scalability Expectations

Design for users owning:

- 1 card
- 5 cards
- 25 cards
- 100 cards

Data structures should remain performant.

---

# Security Principles

Never expose secrets.

Encrypt sensitive data.

Validate everything.

Sanitize inputs.

Protect against:

- XSS
- CSRF
- SQL Injection
- NoSQL Injection
- Clickjacking
- Rate abuse
- Token theft
- Session fixation

Use secure authentication practices.

---

# Privacy Principles

Users own their data.

Future support:

- export all data
- delete account
- anonymization
- GDPR readiness
- data portability

---

# Offline Philosophy

The application should continue functioning when internet connectivity is unavailable.

Future offline capabilities:

- cached dashboard
- cached cards
- cached statements
- queued mutations
- background synchronization

---

# Technology Stack

## Frontend

- React
- TypeScript
- Vite

---

## Styling

- Tailwind CSS
- CSS Variables
- Design Tokens

---

## UI Components

- shadcn/ui
- Radix UI

---

## State Management

- Zustand

Use slices.

Avoid unnecessary global state.

---

## Data Fetching

- TanStack Query

Requirements:

- caching
- optimistic updates
- retries
- background refetch
- stale management
- pagination support

---

## Forms

- React Hook Form

Validation:

- Zod

---

## Routing

- React Router

Future-ready for route-level code splitting.

---

## Tables

TanStack Table

---

## Charts

Recharts

Future support:

- ECharts

---

## Icons

Lucide

---

## Date Library

date-fns

---

## Backend

Node.js

Framework:

NestJS

---

## Database

PostgreSQL

ORM:

Prisma

---

## Authentication

JWT

Refresh Tokens

Future:

OAuth

Google

Apple

Passkeys

---

## File Storage

Future compatible with:

- AWS S3
- Cloudflare R2
- Supabase Storage

---

## Notifications

Future:

- Push Notifications
- Email
- SMS
- WhatsApp

---

## AI Layer

Future:

- OpenAI
- Anthropic
- Local LLM support

The architecture should isolate AI providers behind a provider abstraction.

---

# Project Structure

Recommended high-level structure:

```
apps/
    web/
    api/

packages/
    ui/
    config/
    types/
    utils/
    eslint-config/
    tsconfig/

docs/

scripts/
```

Monorepo-friendly.

---

# Coding Standards

Every file should:

- have one responsibility
- remain readable
- avoid unnecessary abstractions
- prefer composition
- avoid deep inheritance
- maximize reuse

---

# TypeScript Standards

Rules:

- strict mode
- no implicit any
- exhaustive typing
- discriminated unions
- readonly where applicable
- avoid type assertions
- prefer interfaces for public contracts
- use type aliases for composition

Never disable TypeScript rules to silence errors.

---

# React Standards

Prefer:

- functional components
- hooks
- composition
- memoization only when justified
- lazy loading
- Suspense
- error boundaries

Avoid:

- prop drilling
- unnecessary re-renders
- giant components
- business logic inside JSX

---

# Component Guidelines

Every component should be:

- reusable
- composable
- testable
- accessible
- documented
- typed

---

# Folder Organization

Feature-first architecture.

Example:

```
features/

    dashboard/

    cards/

    transactions/

    rewards/

    statements/

    analytics/

    profile/

shared/

components/

hooks/

services/

store/

utils/

types/

constants/
```

---

# Naming Conventions

Components:

```
CreditCard.tsx
```

Hooks:

```
useRewards.ts
```

Services:

```
reward.service.ts
```

Stores:

```
reward.store.ts
```

Types:

```
reward.types.ts
```

Schemas:

```
reward.schema.ts
```

Constants:

```
reward.constants.ts
```

---

# Environment Configuration

Support:

- development
- staging
- production

Never hardcode:

- URLs
- secrets
- API keys
- credentials

---

# Logging Strategy

Structured logging.

Different log levels:

- debug
- info
- warn
- error

Production logs should be searchable and actionable.

---

# Error Handling

Every API response should use consistent error contracts.

Errors should provide:

- code
- message
- user-friendly description
- actionable resolution when appropriate

Unexpected errors must never expose internal implementation details.

---

# Observability

Prepare the architecture for:

- request tracing
- frontend performance metrics
- API latency
- error monitoring
- audit logs
- health checks

Integrations can be added later without structural changes.

---

# Testing Philosophy

Testing is a first-class concern.

Target coverage across:

- unit tests
- integration tests
- component tests
- end-to-end tests

Critical financial logic must always be covered by automated tests.

---

# Documentation Standards

Every major module should include:

- purpose
- responsibilities
- public APIs
- data flow
- extension points
- assumptions
- known limitations

Architecture decisions should be captured as ADRs where appropriate.

---

# Cursor Implementation Rules

While generating code, Cursor must:

- favor readability over cleverness
- generate production-quality code
- avoid placeholder implementations unless explicitly requested
- maintain consistency with existing architecture
- reuse shared components before creating new ones
- avoid duplicated business logic
- preserve strict typing
- write self-documenting code with meaningful names
- keep functions focused and concise
- respect feature boundaries
- avoid introducing unnecessary dependencies
- ensure new code is testable and accessible
- update relevant documentation when adding significant features

---

**End of Part 1 of 4**

The remaining parts will define the complete functional specification, data model, user flows, modules, AI capabilities, roadmap, implementation phases, and engineering execution plan.


# CardWise
# MASTER PROMPT
## Part 2 of 4 — Product Requirements, Information Architecture, Core Modules & User Experience

> This document continues from **Part 1**.
>
> The objective of this section is to define **exactly what CardWise should do**, how users interact with it, and the complete functional specification for the MVP and future-ready architecture.
>
> Cursor should treat every section below as implementation requirements rather than optional ideas.

---

# Product Mission

CardWise should become the single source of truth for every credit card a user owns.

A user should be able to answer questions like:

- Which card should I use right now?
- When is my next bill due?
- How much should I spend to reach my milestone?
- Which reward points are expiring?
- Which card is costing me money?
- Which card gives the highest cashback here?
- Which card should I close?
- How much credit utilization do I have?
- Which EMI is still active?
- Which statement has suspicious transactions?

without opening multiple banking apps.

---

# Primary User Journey

A new user should be able to:

1. Create an account
2. Add their cards
3. Configure billing cycles
4. Configure statement dates
5. Configure reward programs
6. Configure annual fee rules
7. Add spending manually or import statements
8. View dashboard
9. Receive intelligent recommendations

The onboarding should take less than five minutes.

---

# Information Architecture

The application should be organized around clear product domains.

```
Dashboard

Cards

Transactions

Statements

Bills

Rewards

Milestones

EMIs

Lounge Access

Analytics

Recommendations

Notifications

Profile

Settings

Help
```

Each section should function independently while sharing common data models.

---

# Navigation

Desktop:

- Left sidebar
- Top search
- Global notifications
- User profile
- Breadcrumbs where appropriate

Mobile:

- Bottom navigation
- Floating quick actions
- Slide-over drawers
- Sticky contextual actions

---

# Global Search

Search should eventually support:

- card names
- banks
- transactions
- merchants
- rewards
- lounges
- statements
- categories
- notes

Future:

Natural language search.

Example:

```
Show transactions above ₹5,000 from Amazon last month
```

---

# Dashboard

The dashboard should answer:

"What is the current health of my credit cards?"

It should contain modular widgets.

---

## Dashboard Widgets

### Upcoming Bills

Display:

- due date
- amount due
- minimum due
- days remaining
- payment status

---

### Credit Utilization

Display:

- overall utilization
- per-card utilization
- safe utilization threshold
- warnings

---

### Spending This Month

Metrics:

- total spend
- category breakdown
- trend vs previous month

---

### Rewards Summary

Display:

- available points
- cashback earned
- expiring rewards
- redemption opportunities

---

### Active EMIs

Display:

- remaining tenure
- remaining amount
- monthly EMI
- foreclosure availability (future)

---

### Lounge Access

Display:

- remaining visits
- quarterly limits
- yearly limits
- upcoming expiry

---

### Milestone Progress

Examples:

Spend:

₹1,40,000 of ₹1,50,000

Remaining:

₹10,000

Deadline:

22 days

---

### Card Recommendations

Examples:

Use SBI Cashback for Amazon.

Use Axis Atlas for Travel.

Use HDFC Swiggy for Food.

Use Amex for Dining.

Recommendations must explain WHY.

---

### Payment Calendar

Monthly calendar displaying:

- statement generation
- payment due
- annual fee
- milestone deadline
- reward expiry

---

### Financial Health Score

Future feature.

Composite score based on:

- payment history
- utilization
- overdue bills
- reward efficiency
- active cards

---

# Cards Module

The Cards module is the heart of the application.

Each card should have a rich profile.

---

## Card Details

Store:

- nickname
- bank
- network
- card type
- issuer
- variant
- last four digits
- card color
- card artwork
- issue date
- expiry
- annual fee
- joining fee
- renewal rules
- forex markup
- fuel surcharge
- reward program
- lounge program

---

## Card Status

Possible states:

- Active
- Frozen
- Blocked
- Closed
- Pending Activation
- Expired

---

## Card Overview Screen

Sections:

Summary

Credit Limit

Available Credit

Current Outstanding

Statement Amount

Minimum Due

Reward Balance

Lounge Benefits

Milestone Progress

Offers

Recent Transactions

Documents

Notes

---

## Card Timeline

Chronological events:

Card added

Statement generated

Payment made

Reward redeemed

Limit increased

Annual fee charged

Offer activated

---

# Bills Module

Users should never miss a payment.

---

## Bill Card

Display:

Statement Date

Due Date

Outstanding Amount

Minimum Due

Paid Amount

Remaining Amount

Status

---

## Bill Status

Upcoming

Due Today

Paid

Partially Paid

Overdue

---

## Payment Recording

Allow:

- full payment
- partial payment
- manual adjustment
- payment notes

---

## Future

Automatic payment reconciliation.

---

# Transactions Module

Initially:

Manual entry

CSV import

Statement import

Future:

SMS parsing

Email parsing

Bank integrations

---

## Transaction Fields

Date

Merchant

Amount

Currency

Category

Subcategory

Card Used

Location

Online / Offline

Notes

Tags

Reward Earned

Statement Month

---

## Categories

Food

Travel

Fuel

Shopping

Entertainment

Utilities

Health

Education

Insurance

Bills

Groceries

Subscriptions

Others

Categories must be user editable.

---

## Transaction Filters

Date

Amount

Merchant

Category

Card

Reward

Statement

Tags

Search

---

## Bulk Actions

Categorize

Delete

Tag

Export

Merge

Split

---

# Statements Module

Statements should become intelligent documents.

---

## Statement Overview

Statement Month

Generated Date

Due Date

Opening Balance

Closing Balance

Minimum Due

Interest Charged

Fees

Reward Earned

---

## Statement Features

Download

View PDF

Analyze

Export

Share

---

## Future OCR

Upload PDF

Extract:

Transactions

Reward Summary

Fees

Taxes

Interest

EMIs

Milestones

---

# Rewards Module

Track every reward program.

---

## Reward Types

Cashback

Reward Points

Miles

Coins

Travel Credits

Gift Vouchers

Airline Miles

Hotel Points

---

## Reward Dashboard

Current Balance

Lifetime Earned

Lifetime Redeemed

Expiring Soon

Pending Rewards

---

## Redemption History

Date

Reward Type

Points Used

Value

Partner

Status

---

## Reward Expiry

Display:

Remaining Days

Value

Suggestions

Notifications

---

# Milestone Module

Every premium card has milestones.

Track all of them.

---

Example:

Spend ₹4L

Earn Taj Voucher

Display:

Progress

Remaining Spend

Remaining Days

Projected Completion

---

# Lounge Module

Support:

Domestic

International

Railway

Airport

Future:

Guest visits

Priority Pass

DreamFolks

Visa

Mastercard

RuPay

Amex

---

Display:

Visits Used

Visits Remaining

Quarterly Reset

Yearly Reset

---

# EMI Module

Track:

Original Amount

Interest

Remaining Principal

Remaining Months

Monthly EMI

Foreclosure

Future savings

---

# Offers Module

Future:

Bank offers

Merchant offers

Seasonal campaigns

Card-specific offers

Filter by:

Merchant

Category

Bank

Expiry

---

# Analytics Module

Provide meaningful insights instead of raw charts.

---

## Spending Analytics

Monthly

Weekly

Daily

Quarterly

Yearly

---

## Category Analytics

Pie

Bar

Trend

---

## Merchant Analytics

Top Merchants

Recurring Merchants

Highest Spend

---

## Card Analytics

Best Cashback

Most Used

Highest Rewards

Least Used

Costliest Card

Highest ROI

---

## Reward Analytics

Earned

Redeemed

Expired

Pending

Value Generated

---

## Utilization Analytics

Monthly trend

Per-card trend

Limit increase suggestions

---

# Recommendation Engine

One of the most important features.

The engine should generate contextual advice.

Examples:

Use HDFC Swiggy instead of ICICI Amazon for Swiggy orders.

You are ₹6,500 away from a ₹10,000 travel voucher.

Redeem your reward points before expiry.

Your Axis Atlas annual fee may not be justified.

Shift recurring subscriptions to another card.

Pay this bill today to avoid finance charges.

Every recommendation should include:

Reason

Impact

Estimated savings

Confidence (future)

---

# Notifications

Support multiple notification types.

Payment reminders

Statement generated

Reward expiry

Milestone reminder

Offer expiry

Annual fee reminder

EMI reminder

Card expiry

Security alerts

Future:

Push

Email

SMS

WhatsApp

---

# User Profile

Store:

Name

Email

Phone

Preferred Currency

Timezone

Country

Language

Occupation (optional)

Financial Goals (future)

---

# Settings

General

Cards

Notifications

Appearance

Security

Data Import

Exports

Privacy

Connected Accounts (future)

AI Preferences (future)

---

# Data Import

Support:

CSV

Excel

PDF Statements

Future:

Email sync

SMS sync

Bank APIs

---

# Data Export

Support:

CSV

Excel

JSON

PDF Reports

Complete Backup

---

# Empty States

Every screen should have thoughtfully designed empty states.

Example:

"No cards added yet."

CTA:

Add Your First Card

---

# Loading States

Use skeleton loaders.

Avoid layout shifts.

Keep perceived performance high.

---

# Error States

Errors should always provide:

What happened

Why it happened

How to recover

Retry action

---

# User Experience Principles

Every workflow should minimize clicks.

Common actions should be accessible in one or two interactions.

Use progressive disclosure for advanced settings.

Maintain consistent interaction patterns across modules.

Provide confirmations for destructive actions while allowing undo where appropriate.

Use subtle animations to reinforce state changes, never to delay the user.

---

# Future-Ready Product Expansion

The architecture should leave room for future modules without restructuring the application.

Examples include:

- Family accounts
- Shared household finances
- Business and corporate cards
- AI budgeting assistant
- Tax reporting
- Investment dashboard
- Loan management
- Insurance tracking
- Net worth dashboard
- Subscription management
- Wallet integrations
- UPI analytics
- Banking integrations
- International cards
- Open Banking APIs

Each future module should integrate through shared domain models and reusable services rather than bespoke implementations.

---

**End of Part 2 of 4**

Part 3 will define the complete domain model, database schema, backend architecture, API contracts, AI architecture, business rules, automation engines, security model, and implementation details.

# CardWise
# MASTER PROMPT
## Part 3 of 4 — Backend Architecture, Domain Model, Database Design, API Specification, Business Rules & AI Engine

> This document continues from **Part 2**.
>
> This section defines the complete backend architecture, domain model, database entities, business rules, API design, automation engines, integrations, and AI-ready infrastructure.
>
> Cursor should treat these as implementation requirements, not suggestions.

---

# Backend Philosophy

The backend should be designed as a scalable, modular, domain-driven system.

Goals:

- High cohesion
- Low coupling
- Strong typing
- Easy testing
- Clear separation of concerns
- Horizontally scalable
- Event-driven where appropriate

Every module should expose services instead of directly interacting with other modules.

---

# Architecture Style

Recommended:

```
Presentation Layer
        │
Controllers
        │
Application Services
        │
Domain Services
        │
Repositories
        │
Database
```

Cross-cutting concerns:

- Authentication
- Authorization
- Validation
- Logging
- Metrics
- Caching
- Auditing
- Error Handling

---

# Backend Modules

```
Authentication

Users

Cards

Banks

Transactions

Statements

Bills

Rewards

Milestones

EMIs

Lounge

Offers

Notifications

Analytics

Recommendation Engine

Import Engine

OCR Engine

Search

Settings

Audit Logs

AI

Admin
```

Each module should be independently testable.

---

# Domain Model

The application revolves around these core entities.

```
User

Card

Bank

CardNetwork

BillingCycle

Statement

Bill

Transaction

RewardProgram

RewardBalance

RewardRedemption

Milestone

EMI

Offer

Notification

Reminder

Merchant

Category

Tag

LoungeBenefit

CreditLimitHistory

Payment

Attachment

AuditLog
```

Future entities:

```
Email

SMS

OCRDocument

BankAccount

UPIAccount

Subscription

Loan

Investment

FamilyAccount

SharedCard
```

---

# Primary Relationships

```
User
 ├── Cards
 │      ├── Statements
 │      ├── Transactions
 │      ├── Bills
 │      ├── Rewards
 │      ├── Lounge Benefits
 │      ├── EMIs
 │      └── Milestones
 │
 ├── Notifications
 ├── Settings
 └── Audit Logs
```

All relationships should enforce referential integrity.

---

# Database Design Principles

Use PostgreSQL.

Requirements:

- UUID primary keys
- Soft deletes where appropriate
- Foreign keys
- Created At
- Updated At
- Optimistic locking support
- Indexes for common queries

Avoid duplicated data.

Normalize where reasonable while denormalizing only for performance-critical read models.

---

# Base Entity

Every table should include:

```text
id

createdAt

updatedAt

deletedAt (nullable)

createdBy

updatedBy
```

---

# User Entity

Fields:

- id
- firstName
- lastName
- email
- phone
- avatar
- timezone
- country
- currency
- language
- onboardingCompleted
- preferences
- notificationSettings

---

# Card Entity

Fields:

- id
- userId
- bankId
- networkId
- nickname
- cardName
- lastFourDigits
- cardType
- issueDate
- expiryDate
- creditLimit
- availableLimit
- annualFee
- joiningFee
- forexMarkup
- fuelSurcharge
- rewardProgramId
- loungeProgramId
- billingCycleId
- status
- notes

---

# Bank Entity

Fields:

- id
- name
- logo
- website
- supportEmail
- supportPhone

---

# Statement Entity

Fields:

- id
- cardId
- month
- generatedDate
- dueDate
- openingBalance
- closingBalance
- minimumDue
- interestCharged
- fees
- taxes
- rewardEarned
- pdfUrl

---

# Bill Entity

Fields:

- statementId
- totalDue
- minimumDue
- amountPaid
- remainingAmount
- paymentStatus
- paymentDate

---

# Transaction Entity

Fields:

- id
- cardId
- statementId
- merchantId
- categoryId
- amount
- currency
- rewardEarned
- transactionDate
- postingDate
- description
- location
- onlineOffline
- tags
- notes

---

# Reward Program Entity

Fields:

- bank
- card
- rewardType
- earnRate
- redemptionRate
- expiryPolicy
- partnerPrograms

---

# Reward Balance

Fields:

- availablePoints
- pendingPoints
- redeemedPoints
- expiredPoints
- lifetimeEarned

---

# Milestone Entity

Fields:

- title
- spendTarget
- achievedReward
- startDate
- endDate
- currentSpend
- completed

---

# EMI Entity

Fields:

- merchant
- principal
- interestRate
- duration
- remainingMonths
- remainingPrincipal
- monthlyInstallment

---

# Lounge Entity

Fields:

- domesticVisits
- internationalVisits
- guestVisits
- quarterlyLimit
- yearlyLimit
- lastReset

---

# Notification Entity

Fields:

- title
- description
- priority
- category
- deliveryChannel
- scheduledAt
- deliveredAt
- status

---

# Audit Log

Every important action should generate an audit event.

Examples:

User Login

Card Added

Statement Imported

Bill Paid

Reward Redeemed

Settings Updated

Data Exported

---

# API Design Philosophy

REST-first architecture.

Future-ready for GraphQL.

Version every API.

Example:

```
/api/v1/
```

---

# API Response Format

Success

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "message": ""
}
```

Error

```json
{
  "success": false,
  "error": {
    "code": "",
    "message": "",
    "details": []
  }
}
```

Maintain consistency across all endpoints.

---

# Authentication APIs

```
POST /auth/register

POST /auth/login

POST /auth/logout

POST /auth/refresh

POST /auth/forgot-password

POST /auth/reset-password

GET /auth/me
```

Future:

Passkeys

Google

Apple

GitHub

---

# User APIs

```
GET /users/me

PATCH /users/me

DELETE /users/me
```

---

# Cards APIs

```
GET /cards

GET /cards/:id

POST /cards

PATCH /cards/:id

DELETE /cards/:id
```

---

# Transactions APIs

```
GET /transactions

POST /transactions

PATCH /transactions/:id

DELETE /transactions/:id
```

Support:

Pagination

Filtering

Sorting

Searching

---

# Statements APIs

```
GET /statements

POST /statements

POST /statements/import

GET /statements/:id
```

---

# Bills APIs

```
GET /bills

PATCH /bills/:id/pay

GET /calendar
```

---

# Rewards APIs

```
GET /rewards

GET /rewards/history

POST /rewards/redeem
```

---

# Analytics APIs

```
GET /analytics/spending

GET /analytics/cards

GET /analytics/rewards

GET /analytics/utilization
```

---

# Recommendation APIs

```
GET /recommendations

POST /recommendations/refresh
```

---

# Search API

```
GET /search
```

Future:

Semantic search

AI search

---

# Import APIs

```
POST /import/csv

POST /import/pdf

POST /import/excel
```

Future:

```
POST /import/email

POST /import/sms
```

---

# Validation

Every request should use:

Zod DTO validation (shared contracts where possible)

Validate:

- types
- ranges
- enums
- formats
- ownership
- permissions

Never trust client input.

---

# Authorization

Use Role-Based Access Control.

Roles:

```
User

Premium

Admin

Support
```

Future:

Organization

Family Owner

Family Member

---

# Business Rules

## Credit Utilization

```
Utilization =
Outstanding / Credit Limit
```

Warn user above configurable thresholds (default 30%).

---

## Due Date Rules

If due date falls on a holiday:

Support configurable bank-specific behavior.

---

## Reward Calculation

Rules should be configurable.

Never hardcode reward formulas.

Support:

- percentage cashback
- fixed cashback
- reward points
- miles
- partner multipliers
- category multipliers
- promotional campaigns

---

## Milestone Tracking

Progress should update automatically whenever qualifying transactions are added, edited, or removed.

---

## Lounge Rules

Support:

Quarterly reset

Yearly reset

Calendar-based reset

Anniversary-based reset

---

## Annual Fee Rules

Support:

Always charged

Spend waiver

Invite waiver

Lifetime free

Promotional waiver

---

# Recommendation Engine

The recommendation engine is a core differentiator.

It should combine:

- card metadata
- reward rules
- utilization
- milestones
- upcoming bills
- offers
- user behavior

Recommendations must always explain the reasoning.

Example:

```
Use SBI Cashback.

Reason:

5% cashback.

Estimated Savings:

₹350
```

---

# Rule Engine

Business rules should be configurable rather than embedded in application logic.

Future support:

JSON rule definitions

Feature flags

A/B experiments

---

# Scheduler

Support scheduled background jobs.

Examples:

Daily reminders

Reward expiry scans

Milestone progress updates

Statement reminders

Analytics refresh

Recommendation regeneration

---

# Event-Driven Architecture

Important events:

```
CardCreated

StatementImported

BillPaid

RewardRedeemed

TransactionAdded

TransactionUpdated

TransactionDeleted

MilestoneAchieved

RewardExpired
```

Consumers should react without tight coupling.

---

# AI Layer

The AI system should be provider-agnostic.

Architecture:

```
AI Provider Interface

↓

OpenAI

Anthropic

Gemini

Local LLM

Future Providers
```

Never expose provider-specific code throughout the application.

---

# AI Capabilities

Future capabilities include:

Statement summarization

Reward optimization

Transaction categorization

Merchant normalization

Financial coaching

Natural language search

Bill explanations

Smart insights

Monthly summaries

Card recommendations

Expense anomaly detection

---

# OCR Engine

Future pipeline:

```
Upload PDF

↓

OCR

↓

Extract Text

↓

Identify Sections

↓

Parse Transactions

↓

Validate

↓

Store
```

Support confidence scores and manual review.

---

# Email Import Engine

Future:

Connect Gmail or Outlook.

Automatically detect statement emails.

Extract:

- PDF attachments
- due dates
- statement totals

---

# SMS Import Engine

Future:

Parse bank SMS messages.

Detect:

Payments

Transactions

Bills

Credit limit changes

Rewards

---

# Caching Strategy

Use Redis.

Cache:

Dashboard

Analytics

Recommendations

Lookup data

Bank metadata

Reward rules

Invalidate intelligently on writes.

---

# Rate Limiting

Protect public APIs.

Different limits for:

Anonymous users

Authenticated users

Premium users

Admin APIs

---

# Security

Implement:

JWT rotation

Refresh token revocation

Password hashing (Argon2 or bcrypt)

CSRF protection where applicable

CORS

Helmet

Input sanitization

SQL injection protection

Secrets management

Audit trails

Encryption for sensitive fields at rest where appropriate

---

# Monitoring

Prepare integrations for:

Sentry

OpenTelemetry

Grafana

Prometheus

Health endpoints

Structured logs

Business metrics

---

# Testing Requirements

Every module should include:

Unit tests

Integration tests

Contract tests

API tests

Critical business logic should achieve high coverage.

---

# Extensibility

The architecture should make it straightforward to introduce:

- New banks
- New card networks
- New reward programs
- New countries
- New currencies
- New AI providers
- New notification channels
- New import sources

without major refactoring.

---

**End of Part 3 of 4**

Part 4 will define the frontend architecture, design system, component library, state management, engineering standards, DevOps, CI/CD, testing strategy, roadmap, implementation phases, Cursor execution rules, and future expansion strategy.


# CardWise
# MASTER PROMPT
## Part 4 of 4 — Frontend Architecture, Design System, Engineering Standards, DevOps, Implementation Roadmap & Cursor Execution Guide

> This is the final part of the CardWise Master Prompt.
>
> Combined with Parts 1–3, this document serves as the single source of truth for building CardWise as a production-grade fintech application.
>
> Cursor should follow this document throughout the lifecycle of the project.

---

# Frontend Philosophy

The frontend should feel like a premium desktop application rather than a traditional website.

Every interaction should be:

- Fast
- Predictable
- Beautiful
- Accessible
- Consistent
- Responsive

The application should prioritize clarity over visual complexity.

---

# UI Principles

Every screen should answer three questions immediately:

1. Where am I?
2. What is important?
3. What should I do next?

The interface should always guide users toward meaningful actions.

---

# Design Language

Design inspiration:

- Linear
- Stripe Dashboard
- Apple Wallet
- Notion
- Arc Browser
- Revolut
- CRED
- Amex

Characteristics:

- Clean layouts
- Large spacing
- Soft shadows
- Rounded corners
- Subtle motion
- Elegant typography
- Minimal noise
- High information density without feeling cluttered

---

# Responsive Design

Support:

- Mobile
- Tablet
- Laptop
- Desktop
- Ultra-wide

Breakpoints should be tokenized.

Avoid device-specific implementations.

---

# Design Tokens

Create centralized tokens for:

Colors

Typography

Spacing

Radius

Elevation

Border Width

Opacity

Animation

Transitions

Shadows

Blur

Z-index

Never hardcode values inside components.

---

# Typography

Recommended:

Headings

Body

Caption

Label

Code

Maintain a consistent type scale throughout the application.

---

# Color System

Semantic colors:

Primary

Secondary

Success

Warning

Danger

Info

Neutral

Muted

Surface

Background

Border

Text

Support dark mode from day one.

---

# Iconography

Use Lucide icons consistently.

Guidelines:

- One icon style
- Consistent sizing
- Decorative icons hidden from screen readers where appropriate

---

# Motion Design

Animations should communicate state changes.

Examples:

Drawer open

Modal fade

Toast

Accordion

Card hover

Loading skeleton

Page transition

Avoid excessive motion.

Respect reduced-motion preferences.

---

# Layout System

Global layout:

```
Sidebar

↓

Header

↓

Content

↓

Footer (optional)
```

Each feature module owns its internal layout while adhering to shared spacing and component standards.

---

# Component Library

Shared components should live in a dedicated package.

Core components include:

Buttons

Inputs

Select

Autocomplete

Combobox

Date Picker

Calendar

Dialog

Drawer

Popover

Tooltip

Badge

Chip

Avatar

Tabs

Accordion

Toast

Progress

Stepper

Card

Stat Card

Table

Data Grid

Pagination

Search Bar

Command Palette

Timeline

Charts

Metric Cards

Skeleton

Empty State

Error State

Confirmation Dialog

File Upload

PDF Viewer

Markdown Renderer

---

# Dashboard Components

Create reusable widgets.

Examples:

Upcoming Bills Widget

Credit Utilization Widget

Reward Widget

Spending Widget

Calendar Widget

Recommendation Widget

Quick Actions Widget

Recent Transactions Widget

Each widget should be independently configurable and reusable.

---

# Card Components

Examples:

Card Preview

Card Summary

Card Details

Card Timeline

Reward Progress

Annual Fee Card

Benefit Card

EMI Card

Offer Card

Limit Utilization

---

# Tables

All data tables should support:

Pagination

Sorting

Filtering

Column Visibility

Sticky Header

Row Selection

CSV Export

Search

Bulk Actions

Responsive Collapse

Keyboard Navigation

---

# Charts

Support:

Line

Area

Bar

Stacked Bar

Pie

Donut

Heatmap

Trend

Future:

Forecast

AI insights overlay

---

# Forms

All forms should include:

Validation

Inline errors

Autosave (where appropriate)

Unsaved changes warning

Keyboard accessibility

Consistent spacing

---

# Empty States

Each module must have thoughtful empty states.

Examples:

No cards added

No transactions

No statements

No rewards

No milestones

Each should explain:

- What happened
- Why
- What action to take

---

# Error Boundaries

Every major feature should include isolated error boundaries.

One module failing should never crash the entire application.

---

# State Management

Use Zustand.

Organize stores by domain.

Example:

```
auth.store.ts

card.store.ts

dashboard.store.ts

reward.store.ts

settings.store.ts
```

Keep UI state separate from server state.

---

# Server State

Use TanStack Query.

Responsibilities:

Caching

Retries

Background Refresh

Pagination

Optimistic Updates

Mutation Handling

Cache Invalidation

---

# Routing

Organize routes by feature.

Example:

```
/

dashboard

/cards

/cards/:id

/statements

/rewards

/analytics

/profile

/settings
```

Support lazy loading for feature bundles.

---

# File Structure

```
apps/
  web/
    src/
      app/
      assets/
      components/
      features/
      hooks/
      layouts/
      lib/
      providers/
      routes/
      services/
      store/
      styles/
      types/
      utils/

packages/
  ui/
  config/
  types/
  utils/
```

Maintain feature-first organization.

---

# Code Quality

Standards:

- Strict TypeScript
- ESLint
- Prettier
- Husky
- lint-staged

No unused code.

No commented-out blocks.

Avoid premature abstraction.

---

# Naming Conventions

Use clear, descriptive names.

Examples:

```
calculateRewardValue()

getUpcomingBills()

generateMonthlyAnalytics()

recommendBestCard()
```

Avoid ambiguous names like:

```
temp()

helper()

misc()

utils2()
```

---

# Performance Guidelines

Optimize:

Bundle size

Re-renders

Image loading

Code splitting

Memoization

Virtualization

Prefetching

Avoid unnecessary network requests.

---

# Accessibility

Every feature should support:

Keyboard navigation

Visible focus

Screen readers

Semantic HTML

High contrast

Reduced motion

Accessible labels

Proper ARIA usage where necessary

---

# Internationalization

Prepare for:

Multiple languages

Multiple currencies

Multiple date formats

Time zones

Pluralization

RTL support (future)

Never hardcode locale-sensitive values.

---

# Progressive Web App

Support:

Offline shell

Install prompt

Background sync (future)

Caching

App manifest

Service worker

---

# Security

Frontend responsibilities:

Secure token handling

XSS prevention

Input sanitization

Content Security Policy compatibility

Secure storage strategy

Never expose secrets.

---

# CI/CD

Recommended pipeline:

```
Install

↓

Type Check

↓

Lint

↓

Unit Tests

↓

Build

↓

Integration Tests

↓

E2E Tests

↓

Security Scan

↓

Deploy
```

---

# Deployment

Recommended infrastructure:

Frontend:

- Vercel

Alternative:

- Netlify
- Cloudflare Pages

Backend:

- Railway
- Render
- Fly.io
- AWS ECS
- DigitalOcean

Database:

- PostgreSQL

Cache:

- Redis

Storage:

- S3-compatible

---

# Environment Strategy

Separate environments:

Development

Preview

Staging

Production

Each environment should have isolated configuration and secrets.

---

# Monitoring

Track:

Frontend Errors

Backend Errors

API Latency

Slow Queries

Crash Reports

Business Metrics

Recommendation Accuracy (future)

AI Usage

---

# Analytics

Capture anonymized product analytics for:

Feature usage

Search usage

Navigation

Drop-off points

Import success rates

Recommendation acceptance

Never collect sensitive financial information beyond what is necessary for product functionality.

---

# Backup & Recovery

Support:

Database backups

Versioned storage

Restore procedures

Disaster recovery planning

Export user data on demand.

---

# Documentation Standards

Maintain documentation for:

Architecture

Modules

API

Database

Design System

Deployment

Testing

Security

AI

ADRs (Architecture Decision Records)

Update documentation alongside feature development.

---

# Testing Strategy

## Unit Tests

Business logic

Utility functions

Hooks

Stores

## Component Tests

Rendering

Interactions

Accessibility

## Integration Tests

API

Repositories

Services

## End-to-End Tests

Critical user flows:

- Registration
- Login
- Add card
- Import statement
- Record payment
- View analytics
- Redeem rewards

---

# Definition of Done

A feature is complete only when:

- Requirements implemented
- Code reviewed
- Type-safe
- Tested
- Accessible
- Responsive
- Performance checked
- Documentation updated
- No lint errors
- No TypeScript errors

---

# Implementation Roadmap

## Phase 1 — Foundation

- Project setup
- Authentication
- User onboarding
- Design system
- Dashboard shell
- Card management
- Settings
- Responsive layout

---

## Phase 2 — Core Features

- Bills
- Statements
- Transactions
- Rewards
- Analytics
- Notifications
- Calendar
- Search

---

## Phase 3 — Intelligence

- Recommendation engine
- Rule engine
- Milestones
- Lounge tracking
- EMI tracking
- Offers

---

## Phase 4 — Automation

- Statement import
- CSV import
- OCR
- Email parsing
- SMS parsing
- Background jobs

---

## Phase 5 — AI

- AI Assistant
- Smart categorization
- Natural language search
- Statement explanation
- Spending insights
- Personalized recommendations
- Monthly financial summaries

---

## Phase 6 — Premium Features

- Family accounts
- Shared cards
- Open Banking integrations
- UPI analytics
- Investment overview
- Subscription tracking
- Net worth dashboard

---

# Cursor Development Rules

Cursor should:

- Always preserve architecture consistency.
- Reuse existing components before creating new ones.
- Avoid duplicate business logic.
- Prefer composition over inheritance.
- Generate production-ready code.
- Keep functions small and focused.
- Maintain strict typing.
- Respect feature boundaries.
- Write meaningful commit-ready code.
- Avoid placeholder implementations unless explicitly requested.
- Update related documentation whenever new features are introduced.
- Keep APIs backward compatible whenever possible.
- Design extensible interfaces instead of hardcoded implementations.
- Prioritize readability over cleverness.
- Ensure accessibility is never treated as optional.
- Write code that another engineer can understand six months later.

---

# Non-Goals

CardWise is **not** intended to become:

- A stock trading platform
- A cryptocurrency exchange
- A payment gateway
- A banking core system
- A tax filing application
- A loan origination platform

While integrations with these domains may exist in the future, CardWise's primary focus remains intelligent credit card management.

---

# Long-Term Vision

CardWise should evolve into the definitive financial operating system for credit card users.

It should proactively help users:

- Maximize rewards
- Avoid fees
- Improve credit health
- Understand spending behavior
- Make better financial decisions
- Automate repetitive financial tasks
- Gain confidence in managing multiple credit cards

Over time, CardWise should transition from a management application to an intelligent financial companion that delivers timely, explainable, and actionable recommendations.

---

# Success Metrics

Key product metrics include:

- Onboarding completion rate
- Monthly active users
- Cards added per user
- Statement import success rate
- Bills paid on time
- Reward value earned
- Recommendation acceptance rate
- User retention
- Customer satisfaction
- Performance benchmarks
- Accessibility compliance
- Crash-free sessions

---

# Final Engineering Principles

Every line of code should improve one or more of the following:

- Reliability
- Maintainability
- Scalability
- Security
- Accessibility
- Performance
- Developer Experience
- User Experience

When trade-offs arise, favor long-term maintainability over short-term convenience.

---

# Final Instruction to Cursor

Treat this documentation as the authoritative specification for CardWise.

When implementing any feature:

1. Follow the established architecture.
2. Preserve consistency with existing modules.
3. Favor reusable abstractions over one-off implementations.
4. Keep business rules configurable whenever practical.
5. Generate production-quality code that is secure, testable, accessible, and well-documented.
6. If requirements are ambiguous, choose the solution that best aligns with the product vision and engineering principles defined across Parts 1–4.

The objective is to build CardWise into a world-class, scalable fintech platform that can evolve from an MVP into a mature personal finance ecosystem without requiring architectural rewrites.

---

**End of Master Prompt**

**Version:** 1.0  
**Project:** CardWise  
**Status:** Foundational Specification Complete