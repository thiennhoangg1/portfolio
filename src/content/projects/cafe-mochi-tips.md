---
title: Cafe Mochi Tip Sheet
tagline: The restaurant's nightly tip closeout, on the web and as an iPhone app.
year: "2026"
role: Solo developer
stack: [Next.js, React, TypeScript, Drizzle, Better Auth, Capacitor]
kind: side
order: 3
---

Closing out tips by hand at the end of a long night is slow and easy to get wrong, so I built the tool we use at Cafe Mochi.

## What it does

- **Nightly closeout:** enter the night's tips and who worked. Cooks get 12%, and servers split the other 88% evenly per shift.
- **History:** every saved closeout, so nobody has to dig through paper.
- **Payroll:** tips rolled up per person for each pay period.
- **Accounts:** staff sign in, so the numbers stay private to the restaurant.

## How it's built

A Next.js web app with Drizzle for the database and Better Auth for sign-in, plus an iPhone app built with Capacitor so managers can close out from their phone. The same closeout math later went into the [Cafe Mochi POS](/projects/restaurant-pos).
