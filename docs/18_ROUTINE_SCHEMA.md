# IUT MPE Semester Routine — Data Schema
**Islamic University of Technology (IUT)**
**Department of Mechanical and Production Engineering (MPE)**
**Program:** B.Sc. IPE 1st Year, 2nd Semester | **Semester:** Summer 2026 | **Session:** 2024–2025

---

## 1. Semester Metadata

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| University         | Islamic University of Technology (IUT)     |
| Department         | Mechanical and Production Engineering (MPE)|
| Program            | B.Sc. IPE                                  |
| Year               | 1st Year                                   |
| Semester           | 2nd Semester — Summer Semester 2026        |
| Session            | 2024–2025                                  |
| Timetable Generated| 17 April 2026                              |

---

## 2. Time Slots

| Slot | Start | End   | Label                         |
|------|-------|-------|-------------------------------|
| 1    | 08:00 | 09:15 | Morning 1                     |
| 2    | 09:15 | 10:30 | Morning 2                     |
| 3    | 10:30 | 11:45 | Mid-Morning 1                 |
| 4    | 11:45 | 13:00 | Mid-Morning 2                 |
| R    | 13:00 | 14:30 | Recess (Lunch & Prayer Break) |
| 5    | 14:30 | 15:45 | Afternoon 1                   |
| 6    | 15:45 | 17:00 | Afternoon 2                   |

---

## 3. Groups & Rotation Logic

| Group ID | Label          | Timetable Notation |
|----------|----------------|--------------------|
| G1       | Group 1 (Even) | Superscript ¹      |
| G2       | Group 2 (Odd)  | Superscript ²      |

### ⚠️ Rotation Rule — Alternating Working-Week System

**Both groups have labs every working week.** The rotation is driven by a **working-week counter**, not calendar weeks. Vacations, closures, and holidays simply pause the counter — the alternation never breaks.

#### Core Concept: Position A and Position B

Every working week is either **Type A** or **Type B**. Working weeks always alternate: A → B → A → B → …

| Working Week | G1 Position | G2 Position | Solo Alternating Lab (ME 4210) |
|--------------|-------------|-------------|--------------------------------|
| Odd  (1, 3, 5…) | **Position A** | **Position B** | ME 4210 → G1 |
| Even (2, 4, 6…) | **Position B** | **Position A** | ME 4210 → G2 |

> **Note:** IPE 4208 is NOT part of the alternation. G1 has IPE 4208 every Thu 5–6, G2 has it every Tue 3–4.

#### Position A vs Position B — Paired Lab Assignments

| Pair         | Position A                    | Position B                       |
|--------------|-------------------------------|----------------------------------|
| Tue pair     | Chem 4216 [CL] (Slots 5–6)   | Phy 4214 [PL] (Slot 2)          |
| Thu pair     | ME 4226 [AL] (Slots 1–2)     | EEE 4282 [EL] (Slots 1–2)      |

#### Key Rules

1. **Paired labs swap** — each group performs the *other* group's paired labs the following working week.
2. **ME 4210 (solo)** alternates — G1 on odd working weeks, G2 on even working weeks (one room).
3. **IPE 4208 is FIXED (every working week)** — G1 always Thursday 5–6, G2 always Tuesday 3–4. These do NOT alternate or swap. Each group attends their designated IPE 4208 slot **every** working week.
4. **Working-week counter is independent of calendar weeks.** A skipped calendar week (vacation, closure, etc.) does NOT increment the counter.
5. Every group completes all 6 unique lab courses within each 2-working-week cycle.

---

### 🔄 Week Skip / Manual Swap Feature

When the university is closed for a week (vacation, emergency, holidays), the working-week counter must be paused so students don't repeat the same labs on two consecutive class weeks.

#### How It Works

```
Calendar Week 1  → Working Week 1 (Type A)   ← classes held
Calendar Week 2  → 🚫 VACATION (skipped)      ← counter paused
Calendar Week 3  → Working Week 2 (Type B)   ← alternation continues correctly
Calendar Week 4  → Working Week 3 (Type A)   ← back to A
```

Without the skip feature, Calendar Week 3 would wrongly repeat Type A (same labs as Week 1).

#### Rules for Admins / CRs

| Scenario | Action | Effect |
|----------|--------|--------|
| Normal week (classes held) | None — counter auto-increments | Next working week alternates |
| Vacation / closure (no classes) | Admin marks week as **"Skipped"** | Counter does NOT increment |
| Multiple consecutive weeks off | Mark each off-week as Skipped | Counter stays frozen until classes resume |
| Mistake / wrong week marked | Admin can **undo skip** | Counter re-adjusts |

#### Multi-Week Skip Example

```
Cal Week 1  → Working Week 1 (Type A)
Cal Week 2  → 🚫 Skipped
Cal Week 3  → 🚫 Skipped
Cal Week 4  → Working Week 2 (Type B)   ← still alternates correctly
Cal Week 5  → Working Week 3 (Type A)
```

#### Data Model (for implementation)

```
RoutineWeek {
  calendarWeekStart: Date        // Monday of this calendar week
  workingWeekNumber: Int | null  // null = skipped week
  weekType: 'A' | 'B' | null    // derived from workingWeekNumber (odd=A, even=B)
  isSkipped: Boolean             // true = vacation/closure
  skippedReason: String?         // "Mid-semester break", "Emergency closure", etc.
  markedBy: UserId               // admin/CR who marked the skip
  markedAt: DateTime             // when it was marked
}
```

---

## 4. Subjects Directory

### 4.1 Regular Theory / Tutorial Classes (Weekly — Both Groups Together)

| Code      | Full Name                                      | Type    |
|-----------|------------------------------------------------|---------|
| Chem 4215 | Chemistry of Engineering Materials             | Theory  |
| Math 4211 | PDE, Special Functions, Laplace & Fourier      | Theory  |
| EEE 4281  | Electrical Circuits and Machines               | Theory  |
| ME 4225   | Material Engineering                           | Theory  |
| Phy 4213  | Physics (Waves and Oscillation, Geometrical Optics) | Theory |
| Hum 4212  | Humanities (Arabic II)                         | Theory  |

### 4.2 Lab Courses

#### Bi-Weekly Labs (Group-Alternating)

| Code      | Full Name                              | Lab Room | Teachers       |
|-----------|----------------------------------------|----------|----------------|
| ME 4210   | 3D Solid Modeling and Assembling       | CC-2     | HRH / SRC      |
| Chem 4216 | Chemistry Lab                          | CL       | JM / SH        |
| Phy 4214  | Physics Lab                            | PL       | ATM / AH       |
| ME 4226   | Material Engineering Lab               | AL       | MSI / MAS      |
| EEE 4282  | Electrical Circuits & Machines Lab     | EL       | JTR / TRA      |

#### Weekly Fixed Lab (Every Working Week)

| Code      | Full Name                              | Lab Room | Teachers       | Schedule |
|-----------|----------------------------------------|----------|----------------|----------|
| IPE 4208  | Workshop Practice II (Machine Shop)    | MS       | IK/TH or TH/IK | G1: Thu 5–6, G2: Tue 3–4 (every week) |

---

## 5. Regular (Weekly) Class Schedule

### Monday
| Slot | Time          | Subject                            | Code      | Room   | Teacher |
|------|---------------|------------------------------------|-----------|--------|---------|
| 1    | 08:00–09:15   | Chemistry of Engineering Materials | Chem 4215 | 604(2) | SA      |
| 2    | 09:15–10:30   | PDE, Special Functions             | Math 4211 | 604(2) | MTM     |
| 3    | 10:30–11:45   | Electrical Circuits and Machines   | EEE 4281  | 604(2) | AN      |
| 4    | 11:45–13:00   | Material Engineering               | ME 4225   | 604(2) | MAS     |

### Tuesday
> No regular theory classes — full lab day for both groups (on their respective weeks)

### Wednesday
| Slot | Time          | Subject              | Code      | Room  | Teacher |
|------|---------------|----------------------|-----------|-------|---------|
| 2    | 09:15–10:30   | PDE, Special Functions | Math 4211 | Annex | MTM   |
| 3    | 10:30–11:45   | Humanities (Arabic II) | Hum 4212  | Annex | ShA   |
| 4    | 11:45–13:00   | Material Engineering   | ME 4225   | Annex | MAS   |

### Thursday
| Slot | Time          | Subject | Code      | Room   | Teacher |
|------|---------------|---------|-----------|--------|---------|
| 3–4  | 10:30–13:00   | Physics | Phy 4213  | 604(2) | MDR     |

### Friday
| Slot | Time          | Subject                            | Code      | Room   | Teacher |
|------|---------------|------------------------------------|-----------|--------|---------|
| 1    | 08:00–09:15   | Chemistry of Engineering Materials | Chem 4215 | 101(3) | MSU     |
| 2    | 09:15–10:30   | Physics                            | Phy 4213  | 101(3) | AIT     |
| 3    | 10:30–11:45   | Electrical Circuits and Machines   | EEE 4281  | 101(3) | AN      |

---

## 6. Bi-Weekly Lab Schedule

### 6.1 Monday Labs — Slots 5–6 (After Recess)

| Slot | Time        | Subject                          | Code    | G1 Weeks (1 & 3) | G2 Weeks (2 & 4) | Room | Teachers  |
|------|-------------|----------------------------------|---------|-------------------|-------------------|------|-----------|
| 5–6  | 14:30–17:00 | 3D Solid Modeling and Assembling | ME 4210 | ✅ Active (¹)      | ✅ Active (²)      | CC-2 | HRH / SRC |

> Both groups perform ME 4210 on Monday afternoons — G1 in Weeks 1 & 3, G2 in Weeks 2 & 4.

---

### 6.2 Tuesday Labs — Slot 2

| Slot | Time        | Subject     | Code     | Type A (Odd Working Weeks) | Type B (Even Working Weeks) | Room | Teachers |
|------|-------------|-------------|----------|----------------------------|-----------------------------|------|----------|
| 2    | 09:15–10:30 | Physics Lab | Phy 4214 | G2 ✅ (Position B)         | G1 ✅ (Position B)          | PL   | ATM / AH |

> Physics Lab swaps between groups: G2 attends on Type A weeks, G1 on Type B weeks.

---

### 6.3 Tuesday Labs — Slots 3–4

| Slot | Time        | Subject              | Code     | Every Working Week          | Room | Teachers |
|------|-------------|----------------------|----------|-----------------------------|------|----------|
| 3–4  | 10:30–13:00 | Workshop Practice II | IPE 4208 | G2 ✅ (fixed — every week)  | MS   | IK / TH  |

> **IPE 4208 (G2) runs every working week** — it is NOT part of the alternating rotation.

---

### 6.4 Tuesday Labs — Slots 5–6 (After Recess)

| Slot | Time        | Subject       | Code      | Type A (Odd Working Weeks) | Type B (Even Working Weeks) | Room | Teachers |
|------|-------------|---------------|-----------|----------------------------|-----------------------------|------|----------|
| 5–6  | 14:30–17:00 | Chemistry Lab | Chem 4216 | G1 ✅ (Position A)         | G2 ✅ (Position A)          | CL   | JM / SH  |

> Chemistry Lab swaps between groups: G1 attends on Type A weeks, G2 on Type B weeks.

---

### 6.5 Thursday Labs — Slots 1–2 (Simultaneous — Groups Swap Each Working Week)

| Slot | Time        | Subject                    | Code     | Type A (Odd Working Weeks)  | Type B (Even Working Weeks) | Room | Teachers  |
|------|-------------|----------------------------|----------|-----------------------------|--------------------------------|------|-----------|
| 1–2  | 08:00–10:30 | Material Engineering Lab   | ME 4226  | G1 ✅ (Position A)          | G2 ✅ (Position A)           | AL   | MSI / MAS |
| 1–2  | 08:00–10:30 | Elec. Circuits & Mach. Lab | EEE 4282 | G2 ✅ (Position B)          | G1 ✅ (Position B)           | EL   | JTR / TRA |

> Both labs run simultaneously. Groups swap rooms every other working week:
> - Type A weeks: G1 → ME 4226 [AL], G2 → EEE 4282 [EL]
> - Type B weeks: G1 → EEE 4282 [EL], G2 → ME 4226 [AL]

---

### 6.6 Thursday Labs — Slots 5–6

| Slot | Time        | Subject              | Code     | Every Working Week          | Room | Teachers |
|------|-------------|----------------------|----------|-----------------------------|------|----------|
| 5–6  | 14:30–17:00 | Workshop Practice II | IPE 4208 | G1 ✅ (fixed — every week)  | MS   | TH / IK  |

> **IPE 4208 (G1) runs every working week** — it is NOT part of the alternating rotation.

---

## 7. Working-Week Rotation — Consolidated View

> **Both groups have labs every working week.** Paired labs swap each working week.
> Theory classes occur every working week for all students regardless of group.
> Working weeks alternate Type A → Type B → A → B → … (vacations pause the counter, not break it).

### Type A Working Week (Odd: 1st, 3rd, 5th…) — G1 Position A, G2 Position B

| Day       | Slot | G1 (Even) Activity                  | G2 (Odd) Activity                   |
|-----------|------|--------------------------------------|--------------------------------------|
| Monday    | 1    | Chem 4215 — Theory [604(2)]          | *(same)*                            |
| Monday    | 2    | Math 4211 — Theory [604(2)]          | *(same)*                            |
| Monday    | 3    | EEE 4281 — Theory [604(2)]           | *(same)*                            |
| Monday    | 4    | ME 4225 — Theory [604(2)]            | *(same)*                            |
| Monday    | 5–6  | **ME 4210 Lab** [CC-2] ✅            | — Free —                            |
| Tuesday   | 2    | — Free —                             | **Phy 4214 Lab** [PL] ✅            |
| Tuesday   | 3–4  | — Free —                             | **IPE 4208 Lab** [MS] ✅ *(fixed)*  |
| Tuesday   | 5–6  | **Chem 4216 Lab** [CL] ✅            | — Free —                            |
| Wednesday | 2    | Math 4211 — Theory [Annex]           | *(same)*                            |
| Wednesday | 3    | Hum 4212 — Theory [Annex]            | *(same)*                            |
| Wednesday | 4    | ME 4225 — Theory [Annex]             | *(same)*                            |
| Thursday  | 1–2  | **ME 4226 Lab** [AL] ✅              | **EEE 4282 Lab** [EL] ✅            |
| Thursday  | 3–4  | Phy 4213 — Theory [604(2)]           | *(same)*                            |
| Thursday  | 5–6  | **IPE 4208 Lab** [MS] ✅ *(fixed)*   | — Free —                            |
| Friday    | 1    | Chem 4215 — Theory [101(3)]          | *(same)*                            |
| Friday    | 2    | Phy 4213 — Theory [101(3)]           | *(same)*                            |
| Friday    | 3    | EEE 4281 — Theory [101(3)]           | *(same)*                            |

> **G1 labs:** ME 4210, Chem 4216, ME 4226, IPE 4208 (4 labs)
> **G2 labs:** Phy 4214, EEE 4282, IPE 4208 (3 labs)

---

### Type B Working Week (Even: 2nd, 4th, 6th…) — G1 Position B, G2 Position A (Swapped!)

| Day       | Slot | G1 (Even) Activity                   | G2 (Odd) Activity                   |
|-----------|------|---------------------------------------|--------------------------------------|
| Monday    | 1    | Chem 4215 — Theory [604(2)]           | *(same)*                            |
| Monday    | 2    | Math 4211 — Theory [604(2)]           | *(same)*                            |
| Monday    | 3    | EEE 4281 — Theory [604(2)]            | *(same)*                            |
| Monday    | 4    | ME 4225 — Theory [604(2)]             | *(same)*                            |
| Monday    | 5–6  | — Free —                              | **ME 4210 Lab** [CC-2] ✅           |
| Tuesday   | 2    | **Phy 4214 Lab** [PL] ✅              | — Free —                            |
| Tuesday   | 3–4  | — Free —                              | **IPE 4208 Lab** [MS] ✅ *(fixed)*  |
| Tuesday   | 5–6  | — Free —                              | **Chem 4216 Lab** [CL] ✅           |
| Wednesday | 2    | Math 4211 — Theory [Annex]            | *(same)*                            |
| Wednesday | 3    | Hum 4212 — Theory [Annex]             | *(same)*                            |
| Wednesday | 4    | ME 4225 — Theory [Annex]              | *(same)*                            |
| Thursday  | 1–2  | **EEE 4282 Lab** [EL] ✅              | **ME 4226 Lab** [AL] ✅             |
| Thursday  | 3–4  | Phy 4213 — Theory [604(2)]            | *(same)*                            |
| Thursday  | 5–6  | **IPE 4208 Lab** [MS] ✅ *(fixed)*    | — Free —                            |
| Friday    | 1    | Chem 4215 — Theory [101(3)]           | *(same)*                            |
| Friday    | 2    | Phy 4213 — Theory [101(3)]            | *(same)*                            |
| Friday    | 3    | EEE 4281 — Theory [101(3)]            | *(same)*                            |

> **G1 labs:** Phy 4214, EEE 4282, IPE 4208 (3 labs)
> **G2 labs:** ME 4210, Chem 4216, ME 4226, IPE 4208 (4 labs)

---

### 📅 Example: Semester with a Vacation Week

```
Cal Week 1 (Apr 20)  → Working Week 1  → Type A  ← G1: ME4210, Chem4216, ME4226, IPE4208 | G2: Phy4214, EEE4282, IPE4208
Cal Week 2 (Apr 27)  → Working Week 2  → Type B  ← G1: Phy4214, EEE4282, IPE4208 | G2: ME4210, Chem4216, ME4226, IPE4208
Cal Week 3 (May 4)   → 🚫 SKIPPED (Eid vacation)  ← counter paused
Cal Week 4 (May 11)  → Working Week 3  → Type A  ← G1: ME4210, Chem4216, ME4226, IPE4208 ✅
Cal Week 5 (May 18)  → Working Week 4  → Type B  ← G1: Phy4214, EEE4282, IPE4208 ✅
Cal Week 6 (May 25)  → Working Week 5  → Type A  ← continues…
```

Without the skip, Cal Week 4 would wrongly be **Type B** (repeating same labs G1 just did in Cal Week 2).

---

## 8. Lab Course Summary — Rotation Table

| Lab Course                  | Code      | Rotation     | Day       | Slot   | G1 Type A (Odd) | G1 Type B (Even) |
|-----------------------------|-----------|--------------|-----------|--------|------------------|-------------------|
| 3D Solid Modeling           | ME 4210   | alternating  | Monday    | 5–6    | ✅ Active         | — Free            |
| Chemistry Lab               | Chem 4216 | ↔ Phy 4214   | Tuesday   | 5–6    | ✅ Active         | — Free            |
| Physics Lab                 | Phy 4214  | ↔ Chem 4216  | Tuesday   | 2      | — Free            | ✅ Active         |
| **Workshop Practice II**    | IPE 4208  | **FIXED**    | **G1: Thu, G2: Tue** | **G1: 5–6, G2: 3–4** | ✅ **Every week** | ✅ **Every week** |
| Material Engineering Lab    | ME 4226   | ↔ EEE 4282   | Thursday  | 1–2    | ✅ Active         | — Free            |
| Elec. Circuits & Mach. Lab  | EEE 4282  | ↔ ME 4226    | Thursday  | 1–2    | — Free            | ✅ Active         |

> **G1 Type A weeks (odd):** 4 labs (ME 4210, Chem 4216, ME 4226, IPE 4208)
> **G1 Type B weeks (even):** 3 labs (Phy 4214, EEE 4282, IPE 4208)
> **G2 Type A weeks (odd):** 3 labs (Phy 4214, EEE 4282, IPE 4208)
> **G2 Type B weeks (even):** 4 labs (ME 4210, Chem 4216, ME 4226, IPE 4208)
> Paired labs (↔) swap between groups every working week. **IPE 4208 NEVER swaps** — G1 always Thu 5–6, G2 always Tue 3–4, every single working week.

---

## 9. Teachers Directory

| Code | Full Name                          |
|------|------------------------------------|
| AH   | Prof. Dr. A. K. M. Akhter Hossain  |
| AIT  | Prof. Dr. Aminul I. Talukder       |
| AN   | Mr. Asif Newaz                     |
| ATM  | Prof. Dr. A T Md. Kaosar Jamil     |
| HRH  | Mr. Hasdibur Rahman Hamim          |
| IK   | Mr. Immul Kayas                    |
| JM   | Dr. Md. Jalil Miah                 |
| JTR  | Ms. Jasim Tasnim Rahman            |
| MAS  | Dr. Md. Abu Shakid Sujon           |
| MDR  | Dr. Md. Dalitur Rahman             |
| MSI  | Dr. Md. Saiful Islam               |
| MSU  | Dr. Mohammad Shahid Ullah          |
| MTM  | Dr. Md. Tusher Mollah              |
| SA   | Dr. Md. Sofiul Alom                |
| ShA  | Mr. Shabbir Ahmed                  |
| SH   | Mr. Md. Shahabuddin                |
| SRC  | Mr. Sazidur Rahman Chowdhury       |
| TH   | Mr. Tanvir Hossain                 |
| TRA  | Ms. Tabassum Rahman Aishy          |

---

## 10. Classrooms & Labs Directory

| Code   | Location                          | Type      |
|--------|-----------------------------------|-----------|
| 101(3) | Room 101, 3rd Academic Building   | Classroom |
| 102(3) | Room 102, 3rd Academic Building   | Classroom |
| 409(2) | Room 409, 2nd Academic Building   | Classroom |
| 411(2) | Room 411, 2nd Academic Building   | Classroom |
| 604(2) | Room 604, 2nd Academic Building   | Classroom |
| Annex  | Annex Building                    | Classroom |
| AL     | Automobile Lab                    | Lab       |
| CC-2   | Computer Center Lab 2 (CAD/3D)    | Lab       |
| CL     | Chemistry Lab                     | Lab       |
| EL     | Electronics Lab                   | Lab       |
| MS     | Machine Shop (Workshop/IPE Lab)   | Lab       |
| PL     | Physics Lab                       | Lab       |

---

*Schema version 3.0 — updated 17 April 2026.*
*Changes from v2.1: Complete rewrite of rotation logic to working-week alternation system (Type A/B). Removed calendar-week dependency. Added Week Skip feature for vacations/closures. Added data model for RoutineWeek. All lab schedule sections updated to use working-week terminology.*
