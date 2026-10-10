---
title: Cafe Mochi POS & Kiosk
tagline: A touchscreen point-of-sale, time clock, and payroll system for a working restaurant.
year: "2026"
role: Solo developer
stack: [Electron, React, TypeScript, Vite]
kind: side
order: 1
featured: true
---

A Windows touchscreen app built for the restaurant I manage, designed to run on the computers behind the counter all day.

## What it does

- **Orders (POS):** servers ring in orders on either touchscreen, and each ticket prints at the right station: sushi bar, kitchen, or server station. Checks handle tax, discounts, voids, split checks, cash, and receipts.
- **Time clock:** every employee clocks in or out with a PIN and sees their hours for the week.
- **Tip closeout:** the nightly tip split, calculated per shift.
- **History & payroll:** a calendar of saved closeouts, plus payroll that combines tips with clocked hours and wages.
- **Timesheets:** a weekly hours grid with overtime flags; managers can fix missed punches and export a CSV.
- **Employees & permissions:** staff accounts, PINs, and per-person access.

## Design notes

Everything is designed for fingers: large buttons, an on-screen number pad for money, and an on-screen keyboard for names. You don't need a physical keyboard or mouse.
