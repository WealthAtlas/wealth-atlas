# GitHub Copilot Instructions for Wealth Atlas

## Project Overview

**Wealth Atlas** is a local-first React PWA for wealth management built with a Domain-Driven Design (DDD) architecture. The application emphasizes simplicity, maintainability, and clean code principles without over-engineering.

### Core Technology Stack

- **React 18.3** + **TypeScript 5** - Modern React with strict typing
- **Vite** - Fast development and build tooling
- **Material-UI v5** - Component library for consistent UI
- **Dexie v4** - IndexedDB wrapper for local-first data storage
- **React Router v6** - Client-side routing
- **PWA** - Progressive Web App capabilities

### Package Manager

- **pnpm** - Preferred package manager (specified in `package.json` as `packageManager: "pnpm@9.0.0"`)

## Core Development Principles

### 1. Easy Maintenance & Clear Separation

- **Maintainability First** - Code architecture prioritizes long-term maintainability over short-term convenience
- **Clear Boundaries** - Strict separation between domain, data, and application layers
- **Single Responsibility** - Each class, function, and module has one clear purpose

### 2. Self-Documenting Code

- **Code as Documentation** - Write code that is readable and self-explanatory
- **Minimal Comments** - Add comments only when code cannot be made self-explanatory
- **Meaningful Names** - Use descriptive variable, function, and class names that explain intent
- **Essential Comments Only** - Comment complex business logic, non-obvious algorithms, or external API quirks

### 3. Modern Clean Code Practices

- **Latest Design Patterns** - Always use current best practices and modern methodologies
- **No Legacy Patterns** - Avoid outdated approaches in favor of contemporary solutions
- **Clean Architecture** - Follow SOLID principles and clean code guidelines
- **Best Practices** - Apply industry-standard patterns and conventions

### 4. Container-Component Pattern (Strict Separation)

- **Page.tsx** - Pure presentational components for UI rendering only
- **Container.tsx** - Smart components handling data fetching and business logic
- **Clear Responsibilities** - Containers never handle presentation, components never handle data

### 5. Layer-Specific Logic Placement

- **Domain Logic** - All business rules, calculations, and domain operations in `src/domain/`
- **Database Logic** - All data access, persistence, and database operations in `src/data/`
- **Application Logic** - UI state, routing, and component orchestration in `src/app/`

### 6. Strategic Testing (Test Pyramid)

- **Complex Business Logic Only** - Unit tests for critical domain calculations (growth rates, inflation, etc.)
- **No Presentation Tests** - Skip testing for UI components and presentation layer
- **No Data Layer Tests** - Skip testing for repositories and database operations
- **Focus on Value** - Test only the most complex and critical business logic

### 7. Strict Type Safety

- **No `any` Types** - Avoid `any` at all costs; use proper TypeScript types
- **Explicit Types** - Define clear interfaces and types for all data structures
- **Type Guards** - Use type guards for runtime type checking when necessary
- **Generic Constraints** - Leverage TypeScript's type system for compile-time safety

### 8. Material-UI Design System

- **Material-UI Only** - Use Material-UI components exclusively for all UI elements
- **No Custom CSS** - Avoid writing custom CSS; use Material-UI's styling solutions
- **Theme System** - Leverage Material-UI's theming for consistent design
- **Component Library** - Build upon Material-UI's component ecosystem

### 9. Responsive Design Priorities

- **Essential Support** - Tablet and laptop screens are mandatory
- **Mobile Compatibility** - Mobile support is preferred but not required
- **Desktop First** - Optimize primarily for desktop/laptop experience
- **Progressive Enhancement** - Ensure core functionality works across all supported devices

## Architecture Principles

### Domain-Driven Design (DDD)

The project follows a clean DDD architecture with clear separation of concerns:

```
src/
├── domain/           # Pure business logic (entities, value objects)
├── data/             # Data access layer (repositories, records, database)
└── app/              # Application layer (components, containers, routing)
```

### Key Architectural Rules

1. **Domain Layer** (`src/domain/`)
   - Contains pure business entities and logic
   - No dependencies on external frameworks or libraries
   - Entities should evolve from interfaces to classes with business methods
   - Example: `Asset` entity will become a class with validation and business logic

2. **Data Layer** (`src/data/`)
   - **Records** (`src/data/records/`) - Database schema definitions with timestamps
   - **Repositories** (`src/data/repositories/`) - Data access with domain/record mapping
   - **Database** (`src/data/database.ts`) - Dexie configuration with automatic timestamp hooks

3. **Application Layer** (`src/app/`)
   - **Components** - Pure presentational React components
   - **Containers** - Smart components that handle business logic
   - **Hooks** - Reusable React hooks for state and side effects
   - **Router** - Application routing configuration
   - **Theme** - Material-UI theme and styling

### Container-Presentational Pattern

Follow the strict container-component separation:

- **Page.tsx Components** (`src/app/components/`) - Pure presentational components responsible for:
  - UI rendering and layout
  - Receiving props from containers
  - Event delegation to container handlers
  - Zero business logic or data fetching

- **Container.tsx Components** (`src/app/containers/`) - Smart components responsible for:
  - Data fetching and state management
  - Business logic orchestration
  - Event handling and data manipulation
  - Passing processed data to presentation components

## Code Quality Standards

### ESLint Configuration

- Uses **ESLint 9.x** with **flat config** (`eslint.config.mjs`)
- TypeScript + React + Prettier integration
- Strict rules for clean code, no unused variables, prefer const over var
- React-specific rules with React 18.3 settings

### Prettier Formatting

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf",
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

### TypeScript Configuration

- **Strict mode enabled** with comprehensive linting rules
- **ES2020 target** with modern JavaScript features
- **Path mapping** configured (`@/*` → `src/*`)
- **React JSX transform** for automatic React imports

### Quality Scripts

- `pnpm run quality` - Runs type-check, lint, and format:check
- `pnpm run lint:fix` - Auto-fix ESLint issues
- `pnpm run format` - Auto-format code with Prettier

## Development Patterns

### Repository Pattern Implementation

Follow the established repository pattern in `AssetRepository.ts`:

```typescript
export class AssetRepository {
  // Private mapping methods for DRY principle
  private toDomain(record: AssetRecord): Asset {
    /* ... */
  }
  private toRecord(asset: Asset): Omit<AssetRecord, 'id' | 'createdAt' | 'updatedAt'> {
    /* ... */
  }

  // Standard CRUD operations
  async findAll(): Promise<Asset[]> {
    /* ... */
  }
  async findById(id: number): Promise<Asset | null> {
    /* ... */
  }
  async save(asset: Asset): Promise<Asset> {
    /* ... */
  }
  async delete(id: number): Promise<void> {
    /* ... */
  }
}
```

### Database Design Patterns

1. **Automatic Timestamps** - All records have `createdAt` and `updatedAt` managed by Dexie hooks
2. **Generic Timestamp Hooks** - Reusable `setupTimestampHooks<T>()` method for any table
3. **Schema Versioning** - Proper Dexie version management for database migrations

### Entity Evolution Pattern

Entities start as interfaces and evolve to classes:

```typescript
// Current: Simple interface
export interface Asset {
  id?: number;
  name: string;
  description?: string;
}

// Future: Class with business logic
export class Asset {
  constructor(/* ... */) {
    this.validateName();
  }

  private validateName(): void {
    /* validation logic */
  }
  isSimilarTo(other: Asset): boolean {
    /* business logic */
  }
  getDisplayName(): string {
    /* display logic */
  }
}
```

## File Naming Conventions

### Directory Structure

- **PascalCase** for components: `HomePage.tsx`, `HomeContainer.tsx`
- **camelCase** for utilities and hooks: `useAuth.ts`, `database.ts`
- **PascalCase** for entities and records: `Asset.ts`, `AssetRecord.ts`

### Import Organization

1. React and external libraries first
2. Internal domain imports
3. Internal data layer imports
4. Relative imports last
5. Use path mapping `@/*` when beneficial

## Development Workflow

### Scripts Usage

- `pnpm dev` - Start development server (localhost:3000)
- `pnpm build` - Production build with TypeScript compilation
- `pnpm run quality` - **Run before commits** to ensure code quality
- `pnpm run lint:fix && pnpm run format` - Auto-fix common issues

### VS Code Integration

- **Auto-format on save** with Prettier
- **ESLint integration** with auto-fix on save
- **Consistent indentation** (2 spaces, no tabs)
- **Import organization** on save

### PWA Configuration

- Uses `vite-plugin-pwa` for service worker generation
- Auto-update registration type
- Workbox for caching strategies

## AI Coding Guidelines

### When Adding New Features

1. **Start with Domain** - Define entities and business logic first
2. **Create Records** - Design database schema separate from domain
3. **Implement Repository** - Handle data access with proper mapping
4. **Build Container** - Create smart component for business logic
5. **Add Presentation** - Create pure component for UI rendering
6. **Update Router** - Add new routes if needed

### When Refactoring

1. **Preserve Architecture** - Maintain DDD boundaries
2. **Extract Business Logic** - Move from containers to domain entities
3. **Apply DRY Principle** - Use private methods for common patterns
4. **Update Tests** - Ensure quality scripts pass

### When Debugging

1. **Check Quality** - Run `pnpm run quality` first
2. **Verify Timestamps** - Database hooks should auto-manage timestamps
3. **Validate Mapping** - Ensure repository mapping between domain/records
4. **Review Dependencies** - Domain should not depend on external libraries

### Code Review Checklist

- [ ] Follows DDD architecture principles
- [ ] Uses established container-presentational pattern
- [ ] Includes proper TypeScript types
- [ ] Has private mapping methods in repositories
- [ ] Passes `pnpm run quality` checks
- [ ] Uses consistent naming conventions
- [ ] Maintains clean import organization

## Common Anti-Patterns to Avoid

❌ **Don't:**

- Import external libraries in domain entities
- Mix database concerns with business logic
- Use `any` type without justification
- Skip the repository pattern for data access
- Put business logic in React components
- Use `var` instead of `const`/`let`
- Ignore ESLint warnings
- Write custom CSS instead of using Material-UI
- Add unnecessary comments for self-explanatory code
- Use outdated or legacy design patterns
- Test presentation layer or data layer components
- Put domain logic in containers or data logic in components

✅ **Do:**

- Keep domain layer pure from external dependencies
- Use repository pattern for all data access
- Separate concerns between containers and components
- Apply DRY principle with private methods
- Follow established naming conventions
- Maintain strict TypeScript configuration
- Run quality checks before commits
- Use Material-UI components exclusively for UI
- Write self-documenting code with meaningful names
- Apply modern clean code practices and latest design patterns
- Test only complex business logic (calculations, algorithms)
- Place logic in appropriate layers (domain, data, application)

## Future Evolution

### Planned Enhancements

1. **Entity Classes** - Convert interfaces to classes with business methods
2. **Value Objects** - Add domain value objects for complex data types
3. **Advanced Repositories** - Implement query patterns and specifications
4. **State Management** - Consider Zustand for complex application state
5. **Testing** - Add comprehensive unit and integration tests

### Scalability Considerations

- **Modular Architecture** - Easy to add new domains (portfolios, transactions, etc.)
- **Clean Boundaries** - Well-defined layers for maintainability
- **Local-First** - IndexedDB provides offline-first capabilities
- **PWA Ready** - Progressive enhancement for mobile experience

---

_This document should be updated as the project evolves and new patterns emerge._
