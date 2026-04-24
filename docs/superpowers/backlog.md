# Backlog

This is a temporary backlog for the project. Later it should be re-written into a proper project management framework.

## Design tokens

Introduce a set of design tokens, instead of using mantine variables directly. The tokens should be semantic in nature and describe role rather than technical details (e.g. --color-button-bg-primary instead of --color-mantine-yellow).

## Extract domain logic from router components

Pages in `app` should be mostly domain-agnostic. Currently the root `page.tsx` for example includes a lot of domain logic, like `resolveWeapons`. This logic should be defined in an appropriate place in `/features` instead.
