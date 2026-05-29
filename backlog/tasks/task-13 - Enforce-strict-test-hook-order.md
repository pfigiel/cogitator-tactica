---
id: TASK-13
title: Enforce strict test hook order
status: Done
assignee: []
created_date: "2026-05-23 11:01"
updated_date: "2026-05-27 18:24"
labels: []
dependencies: []
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Add a linter rule enforcing order of declaration of test hooks (beforeEach, afterAll etc.). The order should be:

- beforeAll
- beforeEach
- afterEach
- afterAll

Rule should report error if violated. Once the rule is applied, run it to find existing violations and adjust those.

<!-- SECTION:DESCRIPTION:END -->
