# Frontend Architecture Audit

Scope: Angular application under `apps/web`.

Date: 2026-06-28

## Executive Summary

The web app is a modern Angular 19 standalone application with lazy-loaded route components, functional guards/interceptors, Angular signals in feature state, and a clear initial split between `core`, `features`, and `layout`.

The main architectural risk is that the project has two competing styling systems: an empty global design-system folder tree and extensive component-local CSS. This creates duplicated form, card, table, button, metric, spacing, and color rules across features. Tailwind is installed and used in templates, but the active build entry imports only `src/styles.scss`, which imports `styles/index.css`; Tailwind is not imported there. As a result, many utility classes currently appear structurally unreliable unless another build path is being used outside `angular.json`.

The second major risk is service-layer inconsistency. Some features use dedicated core services, while others inject `HttpClient` directly. There are also two `AuthService` classes in separate folders with different responsibilities and token names.

## 1. Folder Structure

```text
apps/web
├── angular.json
├── package.json
├── public
│   ├── assets/i18n
│   ├── i18n
│   └── favicon.ico
├── src
│   ├── app
│   │   ├── app.component.*
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── core
│   │   │   ├── auth
│   │   │   ├── guards
│   │   │   ├── interceptors
│   │   │   ├── models
│   │   │   └── services
│   │   ├── features
│   │   │   ├── auth
│   │   │   ├── customers
│   │   │   ├── dashboard
│   │   │   ├── integrations
│   │   │   ├── reports
│   │   │   ├── reservations
│   │   │   ├── settings
│   │   │   ├── system-admin
│   │   │   ├── tables
│   │   │   └── users
│   │   └── layout
│   ├── assets/i18n
│   ├── environments
│   ├── index.html
│   ├── main.ts
│   ├── styles.scss
│   ├── styles.css
│   ├── styles.scss.bak
│   ├── styles.scss.before
│   └── styles
│       ├── base
│       ├── components
│       ├── layout
│       ├── tokens
│       └── utilities
```

Observations:

- `src/app` follows a reasonable feature-first shape.
- `src/styles` is structured like a design system, but almost every imported file is empty.
- `src/styles.css`, `src/styles.scss.bak`, and `src/styles.scss.before` look like abandoned Tailwind migration artifacts.
- i18n files exist in three locations: `src/assets/i18n`, `public/assets/i18n`, and `public/i18n`. The active translate loader requests `/assets/i18n/{lang}.json`, so duplication should be reconciled.

## 2. Angular Architecture

The app uses Angular standalone APIs:

- `app.config.ts` uses `ApplicationConfig`, `provideRouter`, `provideHttpClient`, functional interceptors, and `provideZoneChangeDetection({ eventCoalescing: true })`.
- `app.routes.ts` lazy-loads standalone route components via `loadComponent`.
- `authGuard` is a functional guard.
- State in multiple features uses signals and computed values.

Routing:

- `/auth` loads `AuthShellComponent` and child auth routes.
- Authenticated app shell loads under the empty path with children for reservations, tables, settings, reports, integrations, and users.
- Wildcard redirects to `reservations`.

Strengths:

- Lazy route component boundaries are simple and effective.
- Signals are used for local UI state in `reservations`, `tables`, `settings`, `users`, `reports`, and auth flows.
- Core HTTP interceptors centralize auth and tenant headers.
- `RestaurantConfigService`, `ReservationHttpService`, and `ReservationDashboardService` are the beginning of a useful data-access layer.

Risks:

- There are two `AuthService` classes: `core/auth/auth.service.ts` and `core/services/auth.service.ts`. The guard uses `core/auth/AuthService`; forgot/reset password use `core/services/AuthService`.
- Token naming is inconsistent. The interceptor reads `access_token`, `core/auth/AuthService` writes `access_token`, but login/register components also write `auth_token`.
- Several feature components bypass core services and call `HttpClient` directly, including users, customers, reports, integrations, system-admin, login, and register-tenant.
- Some components use `window.location.href` instead of `Router.navigate`, which makes navigation harder to test and less Angular-native.
- `CalendarComponent` subscribes to the same socket streams as `ReservationsComponent`, while also receiving reservations through input. This can double-handle realtime updates and makes data ownership blurry.
- `DashboardComponent` is a placeholder and not wired into routes.

Recommended direction:

- Consolidate auth into one `core/auth` service or one `core/services` facade, not both.
- Standardize session storage keys and encapsulate storage access behind the auth service.
- Move direct feature HTTP calls into feature/core data services.
- Make `ReservationsComponent` the owner of realtime reservation state, and pass state/actions down to calendar/grid components.

## 3. Shared Components

Current shared component inventory is thin:

- `layout/ShellComponent`
- `layout/AuthLayoutComponent`
- `features/auth/AuthShellComponent`
- `features/auth/login/LanguageSelectorComponent`
- `features/reservations/components/CalendarComponent`
- `features/reservations/components/GridComponent`

There is no reusable shared UI library for common UI primitives, even though the same patterns appear repeatedly:

- Page header: `.header-block`, `.title-main`, `.subtitle-main`
- Cards/panels: `.panel-card`, `.form-card`, `.table-card`, `.metric-card`
- Tables: `.b2b-table`, `.th-item`, `.td-item`
- Forms: `.input-group`, `.input-label`, `.form-input`, `.form-select`
- Actions: `.submit-btn`, `.save-btn`, `.print-btn`, `.ghost-btn`, `.mini-btn`, `.action-btn`
- Feedback: `.toast-success`, `.alert-error`, `.empty-state`
- Badges: role/status/VIP/table capacity pills

Recommended shared components:

- `app-page-header`
- `app-card`
- `app-button`
- `app-form-field`
- `app-data-table`
- `app-empty-state`
- `app-alert`
- `app-status-badge`
- `app-metric-card`

These should be introduced gradually around real duplication, not as a big-bang rewrite.

## 4. CSS Duplication

CSS is the largest frontend architecture issue.

Approximate component style footprint under `src/app`:

- 12 CSS files, about 1,972 lines.
- 2 SCSS files, about 153 lines.
- Largest files include `login.component.css`, `tables.component.css`, `shell.component.css`, `reports.component.css`, `settings.component.css`, and `users.component.css`.

Duplication examples:

- `.header-block`, `.title-main`, and `.subtitle-main` are copied across reservations, customers, settings, users, reports, tables, integrations, and system-admin.
- `.b2b-table`, `.th-item`, and `.td-item` are repeated in reservations, customers, users, and system-admin.
- `.form-input`, `.form-select`, `.input-group`, `.input-label`, and focus states are repeated across auth, tables, settings, users, and integrations.
- Card styles repeatedly use `#ffffff`, `#e2e8f0`, `1.25rem` radius, and `0 1px 3px rgba(...)`.
- Hard-coded semantic colors for success/error/warning/status badges are repeated with slight variations.
- Inline style attributes appear in templates for layout, widths, text alignment, and colors.
- `CalendarComponent` keeps a large inline `styles` block inside the TypeScript file.

Recommendation:

- Fill the existing `src/styles/components/*.css` files with the repeated primitives already present in components.
- Move page scaffolding rules into `styles/layout`.
- Keep feature CSS only for feature-specific layout and exceptional states.
- Remove inline template styles after corresponding utility/component classes exist.

## 5. Design Tokens Opportunities

The token folder already exists:

- `tokens/colors.css`
- `tokens/spacing.css`
- `tokens/typography.css`
- `tokens/radius.css`
- `tokens/shadows.css`
- `tokens/breakpoints.css`
- `tokens/zindex.css`

However, these files are empty. Component CSS hard-codes the same values everywhere.

Good first token set:

```css
:root {
  --color-bg-app: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-muted: #f1f5f9;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;
  --color-primary: #2563eb;
  --color-danger: #dc2626;
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --radius-xl: 1.25rem;
  --shadow-card: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
}
```

High-value token targets:

- Blue primary scale.
- Slate neutral scale.
- Success, warning, danger, and info status scales.
- Card/table/form radii.
- Focus ring.
- Page max-width and padding.
- Sidebar width and z-index.
- Print visibility tokens or print utility classes.

## 6. Tailwind Usage

Tailwind is installed in `apps/web/package.json`:

- `tailwindcss`
- `@tailwindcss/postcss`
- `@tailwindcss/forms`
- `@tailwindcss/typography`

Tailwind utility classes are used in templates, especially:

- `auth-shell.component.ts`
- `reset-password.component.html`
- `reservations.component.html`
- `users.component.html`
- `customers.component.html`
- `system-admin.component.html`
- `settings.component.html`
- `integrations.component.html`

But the active Angular build style entry is `src/styles.scss`, and it only imports `styles/index.css`. `styles/index.css` does not import Tailwind. Tailwind imports exist in backup or unused files:

- `src/styles.css` imports `tailwindcss`.
- `src/styles.scss.before` imports `tailwindcss`.
- `src/styles.scss.bak` contains legacy `@tailwind base/components/utilities`.

Risk:

- Utility classes may not be generated in the actual Angular build.
- The app mixes Tailwind, local component CSS, and empty design-system CSS, making visual behavior difficult to reason about.

Recommendation:

- Decide on one primary styling strategy:
  - Tailwind-first: import Tailwind from the active `styles.scss`, configure tokens/theme, and reduce component CSS.
  - CSS-token-first: remove Tailwind dependencies/classes and complete the global CSS primitives.
- Given the existing `src/styles` tree, the lower-risk path is CSS-token-first with selective utility classes generated from project CSS, unless the team explicitly wants a Tailwind migration.

## 7. Responsive Architecture

Current responsive behavior exists but is inconsistent.

What works:

- Shell sidebar collapses for `max-width: 768px`.
- Some feature layouts use responsive grids and `auto-fit`.
- Calendar and reservation grid use horizontal overflow/min-width for dense operational layouts.
- Auth login has mobile-specific CSS.

Issues:

- Breakpoints are hard-coded in component CSS instead of tokenized.
- Some features have no mobile-specific table strategy; dense tables can overflow or shrink awkwardly.
- Inline styles and Tailwind classes create local exceptions that are hard to audit.
- Calendar rows use `min-width: 620px`; grid uses fixed 5-column paging. These are pragmatic, but need consistent mobile affordances.
- `styles/layout/responsive.css` and `tokens/breakpoints.css` are empty despite the app needing shared responsive primitives.

Recommendation:

- Define breakpoint tokens and reusable layout classes for page padding, split panels, metrics grids, and table overflow wrappers.
- Standardize tables on either horizontal scroll with sticky first column/header, or card-list transforms on narrow viewports.
- Add explicit responsive acceptance checks for reservations/calendar/grid because those are the highest-density operational screens.

## 8. Accessibility Issues

Positive signs:

- Forgot/reset password flows use `role="alert"`, `aria-live`, and `aria-invalid` in places.
- Forms generally use visible labels.
- Buttons are mostly real `<button>` elements.

Issues found:

- Icon/emoji-only or emoji-leading buttons lack accessible labels in places, such as print, cancel, seat, destroy, and pagination controls.
- Filter buttons in reservations represent a selection state but do not expose `aria-pressed`.
- Drag-and-drop interactions in calendar/grid have no visible keyboard alternative.
- Some alerts/toasts use plain `div` without `role="alert"` or `aria-live`.
- Placeholder text is sometimes doing too much instructional work.
- `href="#"` is used for a help link in login, which can create poor keyboard/screen-reader behavior.
- Inline colored status text and emoji status indicators may not have non-color equivalents.
- `AuthService.logout()` and login components use `window.location.href`, which can interrupt focus management.
- The shell navigation should expose stronger landmarks/labels, such as `aria-label` on primary navigation.

Recommendation:

- Add `aria-label` to icon/emoji action buttons.
- Add `aria-pressed` for filter toggles.
- Make realtime toast/error messages announced.
- Provide keyboard-accessible alternatives for table assignment and reservation rescheduling.
- Add automated axe checks for core pages once a browser test harness exists.

## 9. Performance Improvements

Current strengths:

- Lazy route loading reduces initial route code.
- Angular signals/computed state reduce unnecessary manual subscriptions.
- `provideZoneChangeDetection({ eventCoalescing: true })` is enabled.
- Production budgets are configured.

Improvement opportunities:

- Add `ChangeDetectionStrategy.OnPush` to standalone components. Signals pair well with OnPush.
- Avoid duplicate socket subscriptions in reservations parent and calendar child.
- Avoid recomputing filtered lists in methods called inside templates. Examples include `getReservationsForSlot`, `getTablesByZone`, and `getReservationsForSlot(tableId, hour)` style calls. Convert hot paths to computed maps keyed by slot/table/zone.
- Move inline templates/styles out of large TypeScript components for better incremental rebuild readability and separation.
- Remove unused or duplicate style files to reduce confusion and accidental imports.
- Consider route-level preloading for frequently used authenticated pages after login.
- Add typed API facades to reduce repeated request creation and make caching/invalidation easier.
- Socket connection lifecycle should be centralized to prevent reconnect churn when nested components mount/unmount.

## 10. Technical Debt

Highest-priority debt:

- Duplicate auth services and inconsistent token keys: `access_token` vs `auth_token`.
- Direct `HttpClient` usage in feature components.
- Empty design-system CSS files imported globally.
- Tailwind installed and used in markup, but not active through the configured style entry.
- i18n asset duplication across `src/assets`, `public/assets`, and `public`.
- Hard-coded tenant fallback values like `la-bella-italia`.
- Hard-coded local webhook URL in integrations template.
- Inline template styles and inline component styles.
- Spanish comments and temporary notes like "Corregido", "SANEADO DEFINITIVO", and route injection comments in production code.
- Placeholder/empty files such as `features/users/controllers/users.controller.ts`.
- No visible shared frontend testing strategy beyond a few guard/interceptor/auth tests.

Suggested remediation sequence:

1. Decide and document the styling strategy.
2. Populate tokens and shared component CSS primitives from existing duplicated rules.
3. Consolidate auth service/session storage.
4. Move feature HTTP calls into core/feature services.
5. Normalize i18n asset location.
6. Add accessibility fixes to buttons, filters, alerts, and drag/drop alternatives.
7. Add `OnPush` and computed indexes for reservation/grid hot paths.
8. Delete or archive unused backup/placeholder files after confirming no external references.

## Architectural Recommendation

The app should evolve toward a three-layer frontend architecture:

- `core`: app-wide providers, auth/session, interceptors, API clients, environment-aware infrastructure.
- `features`: route-level smart components and feature-specific components.
- `shared/ui`: reusable presentational components and style primitives.

The existing repo is already close to that shape. The most valuable next step is not a rewrite; it is consolidation. Finish the design-system layer that already exists, remove competing auth/styling paths, and make data access consistent.
