# Natural Language Query Parser

A lightweight, rule-based natural language query parser for Express + Prisma applications. It converts plain English queries into structured Prisma `where` filters — no external NLP libraries required.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Supported Fields & Keywords](#supported-fields--keywords)
  - [Gender](#gender)
  - [Age Group](#age-group)
  - [Age (Exact)](#age-exact)
  - [Age (Range)](#age-range)
  - [Age (Comparison)](#age-comparison)
  - [Country](#country)
  - [Name](#name)
- [Filter Mapping Examples](#filter-mapping-examples)
- [API Usage](#api-usage)
- [Limitations & Edge Cases](#limitations--edge-cases)

---

## Overview

The parser accepts a plain English string via a query parameter (`?q=`) and extracts meaningful filter conditions from it using a set of hand-written regex patterns and keyword maps. The extracted conditions are then passed directly into Prisma's `findMany()` as a `where` clause.

**Supported fields:**

| Field | Type |
|---|---|
| `name` | String (partial match, case-insensitive) |
| `age` | Integer (exact, range, or comparison) |
| `country_name` | String (partial match, case-insensitive) |
| `gender` | Enum: `"male"` \| `"female"` |
| `age_group` | Enum: `"child"` \| `"teen"` \| `"adult"` \| `"senior"` |

---

## How It Works

The parser follows a sequential, field-by-field extraction process. Each step is independent, meaning a failure to detect one field does not affect detection of others.

```
Raw query string
      │
      ▼
Lowercased & trimmed
      │
      ▼
┌─────────────────────────────────────┐
│  Step 1: Gender extraction          │  ──► Collects all gender keywords found
│  Step 2: Age group extraction       │  ──► Matches first age group keyword
│  Step 3: Exact age extraction       │  ──► Regex for "aged 25", "25 years old"
│  Step 4: Age range extraction       │  ──► Regex for "between 20 and 30"
│  Step 5: Age comparison extraction  │  ──► Regex for "above 30", "below 17"
│  Step 6: Country extraction         │  ──► Regex anchored to prepositions
│  Step 7: Name extraction            │  ──► Regex for "named X", "called X"
└─────────────────────────────────────┘
      │
      ▼
Prisma `where` object assembled
      │
      ▼
prisma.user.findMany({ where })
```

**Key design decisions:**

- The query string is lowercased before any matching, so casing in user input never matters.
- Age filters have a strict precedence: exact → range → comparison. Once one is set, the others are skipped, preventing conflicts.
- Gender collects all matches before deciding: one match → exact string, two matches → Prisma `{ in: [...] }` clause.
- Country extraction uses a look-ahead boundary to stop consuming words when it hits another filter keyword (e.g. `above`, `aged`, `who`).

---

## Supported Fields & Keywords

### Gender

Detects one or two genders from the query. If both genders are present, a Prisma `{ in: ["male", "female"] }` clause is used.

| Keywords | Maps to |
|---|---|
| `male`, `males`, `man`, `men`, `boy`, `boys` | `"male"` |
| `female`, `females`, `woman`, `women`, `girl`, `girls` | `"female"` |

**Examples:**

```
"adult males from Kenya"        → gender: "male"
"females above 30"              → gender: "female"
"males and females in Angola"   → gender: { in: ["male", "female"] }
```

---

### Age Group

Matches the first age group keyword found in the query. Only one age group can be active at a time.

| Keywords | Maps to |
|---|---|
| `child`, `children` | `"child"` |
| `young`, `teen`, `teenager`, `teenagers` | `"teen"` |
| `adult`, `adults` | `"adult"` |
| `senior`, `seniors`, `elderly` | `"senior"` |

**Examples:**

```
"adult males from Kenya"    → age_group: "adult"
"young males below 17"      → age_group: "teen"
"elderly women in Brazil"   → age_group: "senior"
```

> **Note:** `"young"` maps to `"teen"`. If your data model treats "young" differently (e.g. as `"child"`), update the `AGE_GROUP_MAP` accordingly.

---

### Age (Exact)

Matches an explicit age number.

**Trigger patterns:**

| Pattern | Example |
|---|---|
| `aged {n}` | `"aged 25"` |
| `age {n}` | `"age 30"` |
| `who are {n}` | `"who are 18"` |
| `exactly {n}` | `"exactly 40"` |
| `{n} years old` | `"25 years old"` |

**Produces:** `age: 25`

---

### Age (Range)

Matches an age range between two numbers.

**Trigger patterns:**

| Pattern | Example |
|---|---|
| `between {n} and {m}` | `"between 20 and 30"` |
| `ages {n} to {m}` | `"ages 18 to 35"` |

**Produces:** `age: { gte: 20, lte: 30 }`

> Range is only applied if no exact age was already found.

---

### Age (Comparison)

Matches relative age filters.

**"Greater than" patterns:**

| Pattern | Example |
|---|---|
| `above {n}` | `"above 30"` |
| `over {n}` | `"over 40"` |
| `older than {n}` | `"older than 25"` |
| `greater than {n}` | `"greater than 18"` |
| `more than {n}` | `"more than 50"` |

**Produces:** `age: { gt: 30 }`

**"Less than" patterns:**

| Pattern | Example |
|---|---|
| `below {n}` | `"below 17"` |
| `under {n}` | `"under 18"` |
| `younger than {n}` | `"younger than 25"` |
| `less than {n}` | `"less than 20"` |

**Produces:** `age: { lt: 17 }`

> Comparison is only applied if no exact age or range was already found.

---

### Country

Extracts a country name following a location preposition. The parser stops consuming words when it hits another filter keyword.

**Trigger patterns:**

| Pattern | Example |
|---|---|
| `from {country}` | `"from Kenya"` |
| `in {country}` | `"in Angola"` |
| `country is {country}` | `"country is Ghana"` |
| `living in {country}` | `"living in Canada"` |
| `based in {country}` | `"based in Nigeria"` |
| `located in {country}` | `"located in Brazil"` |

**Produces:** `country_name: { contains: "Kenya", mode: "insensitive" }`

> Uses `contains` (not exact match), so `"Nig"` would match `"Nigeria"`. Adjust to `equals` if exact matching is needed.

---

### Name

Extracts a name following a name indicator keyword.

**Trigger patterns:**

| Pattern | Example |
|---|---|
| `named {name}` | `"named John"` |
| `name {name}` | `"name John"` |
| `called {name}` | `"called Jane"` |
| `name is {name}` | `"name is Sam"` |

**Produces:** `name: { contains: "John", mode: "insensitive" }`

---

## Filter Mapping Examples

| Query | Prisma `where` produced |
|---|---|
| `"adult males from Kenya"` | `{ age_group: "adult", gender: "male", country_name: { contains: "Kenya" } }` |
| `"males and females above 30 in Angola"` | `{ gender: { in: ["male", "female"] }, age: { gt: 30 }, country_name: { contains: "Angola" } }` |
| `"young males below 17"` | `{ age_group: "teen", gender: "male", age: { lt: 17 } }` |
| `"females from Nigeria between 20 and 35"` | `{ gender: "female", country_name: { contains: "Nigeria" }, age: { gte: 20, lte: 35 } }` |
| `"named John aged 25"` | `{ name: { contains: "John" }, age: 25 }` |
| `"senior women in Canada"` | `{ age_group: "senior", gender: "female", country_name: { contains: "Canada" } }` |

---

## API Usage

**Endpoint:**

```
GET /search?q={your natural language query}
```

**Example requests:**

```bash
GET /search?q=adult males from Kenya
GET /search?q=males and females above 30 in Angola
GET /search?q=young males below 17
GET /search?q=females from Nigeria between 20 and 35
GET /search?q=named John aged 25
```

**Response shape:**

```json
{
  "query": "adult males from Kenya",
  "filters": {
    "age_group": "adult",
    "gender": "male",
    "country_name": { "contains": "Kenya", "mode": "insensitive" }
  },
  "count": 12,
  "data": [ ... ]
}
```

The `filters` field is returned alongside results so you can verify what was parsed — useful during development and debugging.

---

## Limitations & Edge Cases

This parser is intentionally simple and rule-based. It works well for predictable, structured queries but has known gaps.

### 1. No OR logic across fields

The parser only produces AND conditions. There is no way to express:

```
"people from Kenya OR Nigeria"     ✗ not supported
"males aged 25 OR 30"              ✗ not supported
```

Every extracted field is combined with AND in the final `where` clause.

---

### 2. Multi-country queries are not supported

Only one country can be extracted per query. The regex captures the first country preposition match and stops.

```
"females from Kenya and Ghana"    → only "Kenya" is captured
```

---

### 3. Country names with multiple words may be partially captured

The country regex stops at filter boundary words (`above`, `aged`, `who`, etc.). Multi-word country names that contain common words may be cut short.

```
"males from South Africa above 30"   → may capture "South Africa" correctly ✓
"males from United Arab Emirates"    → may only capture "United Arab" ✗
```

The boundary list would need to be extended to support more complex country names reliably.

---

### 4. Ambiguous age group + age comparison

If a query contains both an age group word and a numeric age comparison, both are applied independently. The parser does not verify whether they are logically consistent.

```
"adult males below 10"
→ { age_group: "adult", gender: "male", age: { lt: 10 } }
```

This produces a valid Prisma query but may return zero results if your data is consistent (adults are never below 10). No validation or conflict detection is done.

---

### 5. Only one age group is matched

The parser breaks after the first matched age group keyword. A query like `"children and adults"` would only capture `"child"`.

```
"children and adults from Ghana"    → age_group: "child" only
```

---

### 6. Name must be a single word

The name regex only captures one word after the trigger keyword. Multi-word names are not supported.

```
"named John Doe"     → captures "John" only
"called Mary Jane"   → captures "Mary" only
```

---

### 7. No typo tolerance

The parser does exact keyword matching. Common misspellings or variations are not handled.

```
"femal from Kenya"      → gender not detected
"senoir women"          → age_group not detected
"form Nigeria"          → country not detected (wrong preposition)
```

---

### 8. No negation support

Negative expressions are not parsed. The parser has no concept of exclusion.

```
"people not from Nigeria"       → still matches Nigeria
"adults who are not female"     → still matches female
```

---

### 9. Conflicting signals are not resolved

If a query somehow triggers both "above" and "below" patterns, only the first matched (above) is used due to the `else if` chain. The parser does not warn about conflicting input.

```
"males above 20 below 40"    → age: { gt: 20 } — the "below 40" part is ignored
```

Use the range pattern instead: `"males between 20 and 40"`.

---

### 10. Not suitable for free-form conversational input

The parser is designed for short, structured queries. Full sentences or conversational phrasing can confuse the regex boundaries.

```
"Can you show me all the adult men who are living in Nigeria and are older than 25?"
→ may partially work, but reliability decreases with longer, more complex sentences
```

---

### When to upgrade beyond this parser

Consider replacing this rule-based approach with a more robust solution when:

- Queries need OR logic or exclusions
- Free-form conversational input is expected
- You need to support a much wider vocabulary
- Multi-language support is required

Good next steps would be integrating a library like [`compromise`](https://github.com/spencermountain/compromise) for lightweight NLP, or using an LLM call (e.g. Claude or GPT) to convert the query into a structured JSON filter before passing it to Prisma.