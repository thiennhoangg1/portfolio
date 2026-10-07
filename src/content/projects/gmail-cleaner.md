---
title: Gmail Cleaner
tagline: Bulk-delete years of email safely with a dry run before anything is deleted.
year: "2026"
role: Solo developer
stack: [Python, Gmail API, OAuth]
kind: side
order: 9
---

A small script that bulk-deletes Gmail messages matching any search query, such as everything older than three years.

- Signs in through Google's own OAuth consent screen, so your password never touches the script.
- Shows the match count and a sample, then asks for confirmation before deleting.
