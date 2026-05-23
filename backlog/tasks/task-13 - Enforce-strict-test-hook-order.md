---
id: TASK-13
title: Enforce strict test hook order
status: To Do
assignee: []
created_date: "2026-05-23 11:01"
labels: []
dependencies: []
ordinal: 10000
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
