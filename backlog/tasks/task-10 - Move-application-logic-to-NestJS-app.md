---
id: TASK-10
title: Move application logic to NestJS app
status: To Do
assignee: []
created_date: "2026-05-13 19:10"
labels: []
dependencies: []
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Move existing backend logic from the Next app to the NestJS one. This includes the endpoints and the underlying business logic.

The Next backend logic was written quickly, as a PoC. During the migration however, we should clean it up and implement properly. This includes proper separation of concerns, following all the best practices. Special care should be taken to clean up the simulation logic - it should be readable and testable.

There should definitely be serparate services for embeddings generation and communication with LLM. These should be domain-agnostic, reusable clients for communicating with external providers. Additional domain-specific services and functionalities can be built on top of these. Splitting the existing logic into further services etc. should be decided during planning.

Do not remove the existing Next logic yet, NestJS should for now mirror its functionality.

<!-- SECTION:DESCRIPTION:END -->
