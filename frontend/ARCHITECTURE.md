# Frontend Architecture Documentation

## Project Structure

### Overview
This is an industry-standard React + TypeScript frontend application built with Vite, featuring a centralized CSS architecture, strict TypeScript typing, and optimized performance.

```
frontend/
├── src/
│   ├── styles/                 # Centralized CSS architecture
│   │   ├── index.css          # Main entry point (imports all styles)
│   │   ├── variables.css      # Design tokens and CSS custom properties
│   │   ├── base.css           # Reset and foundational styles
│   │   ├── animations.css     # Keyframe animations
│   │   ├── components.css     # Component-specific styles
│   │   └── responsive.css     # Media queries and responsive design
│   ├── components/            # Reusable React components
│   ├── pages/                 # Page-level components
│   ├── services/              # API services with full typing
│   ├── types/                 # TypeScript type definitions
│   ├── api/                   # Axios configuration with interceptors
│   ├── App.tsx               # Main app component
│   └── main.tsx              # Entry point
├── vite.config.ts            # Production-optimized Vite configuration
├── tsconfig.app.json         # Strict TypeScript configuration
├── eslint.config.js          # Industry-standard ESLint rules
└── package.json              # Dependencies and scripts
```

## CSS Architecture

### Design System: Single Source of Truth

All styling follows a centralized, modular approach:

#### 1. **variables.css**
- CSS custom properties for design tokens
- Color palette, typography, spacing, shadows, z-index, transitions
- Separate light and dark mode variables
- Responsive breakpoint handling

#### 2. **base.css**
- Global resets and foundational styles
- HTML, body, typography (h1-h3, p, code)
- Base form elements
- Layout structure for root elements

#### 3. **animations.css**
- All keyframe animations (slideUp, fadeIn, spin, shake)
- Animation utility classes
- Consistent motion design

#### 4. **components.css**
- Organized by component category:
  - Form components (inputs, labels, password toggle)
  - Error messages and status alerts
  - Button styles (primary, danger, secondary)
  - Card and container styles
  - Auth page styles
  - Chat components (header, sidebar, messages)
  - User list styles
  - Scrollbar styling

#### 5. **responsive.css**
- Mobile-first responsive design
- Breakpoints:
  - 1200px+ (large desktop)
  - 768px (tablet)
  - 480px (mobile)
  - 360px (extra small devices)
- Landscape orientation handling
- High DPI display optimization
- Reduced motion preferences
- High contrast mode support

#### 6. **index.css**
- Main entry point that imports all style modules
- Utility classes for common patterns
- Print styles

### Naming Conventions

- **BEM-inspired**: `block-element__modifier`
- **Utility classes**: Single-purpose utilities (`.flex`, `.mt-auto`, `.text-center`)
- **Semantic naming**: Classes describe purpose, not appearance
- **Consistency**: Same class names across all components

### Benefits

✅ Single source of truth for all styles
✅ Easy maintenance and updates
✅ Consistent design system
✅ Efficient CSS delivery
✅ Scalable architecture
✅ No duplication
✅ Performance optimized

## TypeScript Configuration

### Strict Type Checking

- `strict: true` - All strict options enabled
- `noImplicitAny` - Disallow untyped variables
- `strictNullChecks` - Strict null/undefined handling
- `noImplicitReturns` - Require explicit return types
- `noUnusedLocals` - Error on unused variables
- `noUnusedParameters` - Error on unused parameters
- `noImplicitOverride` - Require override keyword

### Build Targets

- **Target**: ES2023 - Modern JavaScript features
- **Lib**: ES2023, DOM, DOM.Iterable
- **Module**: ESNext with bundler resolution

## Services & API

### API Configuration (axios.ts)

```typescript
- Base URL from environment variable
- 10s timeout
- Automatic token injection
- 401 response handling (auto logout)
- Type-safe responses
```

### Service Classes

All services use strict typing with generics:

- **AuthService**: Login, Register, Logout
- **UserService**: Get users list
- **ConversationService**: Create conversations
- **MessageService**: Create and retrieve messages

## Performance Optimization

### Vite Build Configuration

```typescript
- Terser minification with 2 passes
- Console/debugger removal
- Vendor chunk splitting:
  - React dependencies
  - Axios
- Asset file organization:
  - Images, Fonts, CSS, JS in separate folders
- Gzip compression ready
- Source maps disabled in production
```

### Bundle Analysis

- `rollup-plugin-visualizer` for bundle analysis
- Chunk size warnings at 600KB
- Manual chunk configuration for optimization

### Loading & Performance

- Lazy route loading possible with React Router
- CSS is globally imported (minimal overhead)
- Tree-shaking enabled
- Dead code elimination

## ESLint & Code Quality

### Strict Rules

- TypeScript strict checking
- React hooks rules
- No console in production
- No explicit `any` types
- No floating promises
- Unused variable detection

### Run Linting

```bash
npm run lint
```

## Type Definitions

### Core Types

**User**
```typescript
{ id, username, email }
```

**Message**
```typescript
{ id, content, senderId, conversationId, createdAt, updatedAt }
```

**Conversation**
```typescript
{ id, participantIds, createdAt, updatedAt }
```

**LoginResponse**
```typescript
{ token, user }
```

## Build & Development

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production (TypeScript + Vite)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Environment Variables

```
VITE_API_URL=http://localhost:6000/api
```

## Removed (Cleanup)

✗ Unused CSS files (individual component styles)
✗ Empty component files (MessageInput, MessageList, ConversationList)
✗ Empty context files (AuthContext)
✗ Unused utility files (error.ts)
✗ Template code (old App.css)

## Best Practices Implemented

✅ **Single Responsibility**: Components do one thing well
✅ **DRY (Don't Repeat Yourself)**: Centralized styles and types
✅ **Scalability**: Easy to add new components and pages
✅ **Maintainability**: Clear structure and naming
✅ **Performance**: Optimized builds and lazy loading
✅ **Security**: Strict type checking and validation
✅ **Accessibility**: Semantic HTML and ARIA labels
✅ **Responsive Design**: Mobile-first approach
✅ **Dark Mode Support**: Built-in theme switching

## Future Improvements

- [ ] Add CSS-in-JS if component library needed
- [ ] Implement state management (Redux/Zustand)
- [ ] Add testing (Vitest + React Testing Library)
- [ ] Storybook for component documentation
- [ ] Internationalization (i18n)
- [ ] Service Worker for offline support
- [ ] End-to-end testing (Playwright/Cypress)

## References

- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [ESLint Configuration](https://eslint.org/docs/latest/use/configure/)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
