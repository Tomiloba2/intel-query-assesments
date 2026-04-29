# Insighta Labs+ Backend API

## Overview

The Insighta Labs+ Backend is a secure REST API that powers the Profile Intelligence System. It provides authentication via GitHub OAuth, role-based access control, and full CRUD operations for user profiles. The API serves both the CLI tool and web portal with consistent behavior across all interfaces.

## Technology Stack

| Technology | Purpose |
|------------|---------|
| Express.js | Web framework |
| TypeScript | Type safety |
| Prisma | Database ORM |
| PostgreSQL | Primary database |
| Passport.js | GitHub OAuth |
| JSON Web Tokens | Session management |
| Helmet | Security headers |
| CORS | Cross-origin requests |

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18.0.0 |
| PostgreSQL | >= 14.0 |
| npm | >= 9.0.0 |
| GitHub OAuth App | Registered |

## Installation

### Clone and Setup

```bash
git clone https://github.com/your-username/insighta-backend.git
cd insighta-backend
npm install
```

### Environment Configuration

Create a `.env` file:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/insighta"

# JWT
JWT_ACCESS_SECRET="your-access-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/auth/github/callback"

# Frontend
FRONTEND_URL="http://localhost:5173"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Project Structure

```
src/
├── controllers/
│   ├── authController.ts      # GitHub OAuth, logout, refresh
│   ├── profileController.ts   # CRUD operations for profiles
│   └── searchController.ts    # Natural language search
├── middleware/
│   ├── authMiddleware.ts      # JWT verification
│   ├── roleMiddleware.ts      # Role-based access control
│   ├── versionMiddleware.ts   # API version header validation
│   ├── rateLimitMiddleware.ts # Rate limiting
│   └── errorMiddleware.ts     # Central error handling
├── services/
│   ├── naturalLanguageParser.ts  # Query parsing
│   ├── tokenService.ts        # JWT generation/validation
│   └── externalApiService.ts  # Third-party API integration
├── routes/
│   ├── authRoutes.ts
│   ├── profileRoutes.ts
│   └── searchRoutes.ts
├── utils/
│   ├── logger.ts              # Request logging
│   └── validation.ts          # Input validation
├── types/
│   └── index.ts               # TypeScript interfaces
└── app.ts                     # Express app configuration
```

## Authentication System

### GitHub OAuth with PKCE

The API implements GitHub OAuth with PKCE (Proof Key for Code Exchange) for secure authentication from both web and CLI clients.

**Auth Flow:**

1. Client requests `/auth/github` with `code_challenge` and `state`
2. Backend redirects to GitHub authorization page
3. User authorizes the application
4. GitHub redirects to `/auth/github/callback` with authorization code
5. Backend exchanges code for user info
6. Backend generates access token (3 min) and refresh token (5 min)
7. Tokens are set as HTTP-only cookies (web) or returned in response (CLI)
8. User session is established

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/github` | Initiate GitHub OAuth | No |
| GET | `/auth/github/callback` | OAuth callback handler | No |
| POST | `/auth/refresh` | Refresh access token | No (refresh token in cookie) |
| POST | `/auth/logout` | Invalidate session | Yes |
| GET | `/auth/me` | Get current user | Yes |

### Token Lifecycle

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 3 minutes | HTTP-only cookie or memory | API authorization |
| Refresh Token | 5 minutes | HTTP-only cookie or database | Obtain new access token |

**Token Refresh Process:**

1. Client sends request with expired access token
2. Backend returns 401 Unauthorized
3. Client calls `/auth/refresh` with refresh token
4. Backend validates refresh token and issues new token pair
5. Old refresh token is invalidated immediately
6. Client retries original request with new access token

## Role-Based Access Control

### User Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access: create, read, update, delete profiles |
| `analyst` | Read-only: view and search profiles only |

### Default Role

New users are assigned the `analyst` role by default.

### Account Status

- `is_active: true` - User can access the system
- `is_active: false` - All requests return 403 Forbidden

### Role Enforcement

All protected endpoints check user role via middleware:

```typescript
// Admin-only route
router.post('/profiles', 
  authenticate, 
  requireRole('admin'), 
  createProfile
);

// Analyst (read-only) route
router.get('/profiles', 
  authenticate, 
  requireRole('analyst', 'admin'), 
  listProfiles
);
```

## API Endpoints

### Version Header Requirement

All `/api/*` endpoints require the `X-API-Version` header:

```http
X-API-Version: 1
```

Missing or unsupported version returns:

```json
{
  "status": "error",
  "message": "API version header required"
}
```

### Profile Endpoints

#### List Profiles

```http
GET /api/profiles?page=1&limit=10&gender=male&country=NG
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10, max: 100) |
| gender | string | Filter by gender (male/female) |
| country | string | Filter by country code |
| age_group | string | Filter by age group |
| min_age | number | Minimum age |
| max_age | number | Maximum age |
| sort_by | string | Sort field (name/age/created_at) |
| order | string | Sort order (asc/desc) |

**Response:**

```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "total_pages": 203,
  "links": {
    "self": "/api/profiles?page=1&limit=10",
    "next": "/api/profiles?page=2&limit=10",
    "prev": null
  },
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "gender": "male",
      "gender_probability": 0.95,
      "age": 32,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.87,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Get Single Profile

```http
GET /api/profiles/:id
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "gender": "male",
    "gender_probability": 0.95,
    "age": 32,
    "age_group": "adult",
    "country_id": "NG",
    "country_name": "Nigeria",
    "country_probability": 0.87,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Profile (Admin Only)

```http
POST /api/profiles
Content-Type: application/json

{
  "name": "Harriet Tubman",
  "gender": "female",
  "age": 35,
  "country_id": "US"
}
```

**Response:** 201 Created with profile object

#### Natural Language Search

```http
GET /api/profiles/search?q=young males from Nigeria&page=1&limit=10
```

**Example Queries:**

| Query | What it finds |
|-------|---------------|
| `"adult males from Kenya"` | Adult males in Kenya |
| `"young females below 25"` | Females under 25 years old |
| `"named John aged 30"` | Profiles named John who are 30 |
| `"males and females above 40"` | All genders over 40 |
| `"senior citizens in Canada"` | Elderly profiles in Canada |

**How Search Works:**

The parser extracts conditions using pattern matching:

1. **Gender** - male, female, man, woman, boy, girl
2. **Age Group** - child, young, adult, senior, elderly
3. **Exact Age** - aged 25, 30 years old
4. **Age Range** - between 20 and 30
5. **Age Comparison** - above 30, below 18, older than 25
6. **Country** - from Nigeria, in Kenya, based in Ghana
7. **Name** - named John, called Mary

**Response:**

```json
{
  "status": "success",
  "query": "young males from Nigeria",
  "parsed_filters": {
    "age_group": "teen",
    "gender": "male",
    "country_name": { "contains": "Nigeria", "mode": "insensitive" }
  },
  "page": 1,
  "limit": 10,
  "total": 15,
  "total_pages": 2,
  "data": [...]
}
```

#### Export Profiles to CSV

```http
GET /api/profiles/export?format=csv&gender=male&country=NG
```

**Response:** CSV file download

**Headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="profiles_20240115_103000.csv"
```

**CSV Columns:**
```csv
id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at
```

## Rate Limiting

| Scope | Limit |
|-------|-------|
| Auth endpoints (`/auth/*`) | 10 requests per minute |
| All other endpoints | 60 requests per minute per user |

**Rate Limit Response:**

```json
{
  "status": "error",
  "message": "Too many requests, please try again later"
}
```

Status code: `429 Too Many Requests`

Headers included:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## Logging

Every request is logged with:

```
[2024-01-15T10:30:00.000Z] GET /api/profiles 200 - 45ms
[2024-01-15T10:30:01.000Z] POST /auth/refresh 401 - 12ms
```

**Log format:**
```
timestamp method endpoint statusCode responseTime
```

## Error Handling

All errors follow a consistent format:

```json
{
  "status": "error",
  "message": "Human-readable error description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Resource created |
| 400 | Bad request (missing version header, invalid parameters) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions, account inactive) |
| 404 | Resource not found |
| 409 | Conflict (duplicate entry) |
| 429 | Too many requests (rate limit exceeded) |
| 500 | Internal server error |

## Database Schema

### User Model

```prisma
model User {
  id          String   @id @default(uuid())
  githubId    String   @unique
  username    String
  email       String?
  avatarUrl   String?
  role        String   @default("analyst")  // admin or analyst
  isActive    Boolean  @default(true)
  lastLoginAt DateTime
  createdAt   DateTime @default(now())
  
  refreshTokens RefreshToken[]
}
```

### Profile Model

```prisma
model Profile {
  id                  String   @id @default(uuid())
  name                String
  gender              String?
  genderProbability   Float?
  age                 Int?
  ageGroup            String?
  countryId           String?
  countryName         String?
  countryProbability  Float?
  createdAt           DateTime @default(now())
  
  @@index([name])
  @@index([age])
  @@index([countryName])
}
```

### Refresh Token Model

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## Middleware

### Authentication Middleware

Verifies JWT access token from `Authorization` header or cookie:

```typescript
function authenticate(req, res, next) {
  const token = req.cookies.accessToken || 
                req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
}
```

### Role Middleware

Checks if user has required role:

```typescript
function requireRole(...allowedRoles: string[]) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Forbidden - Insufficient permissions' 
      });
    }
    next();
  };
}
```

### Version Middleware

Validates `X-API-Version` header on all API routes.

### Rate Limit Middleware

Applies different limits for auth and API routes.

## Security Features

- HTTP-only cookies for web sessions
- JWT tokens with short expiration times
- Refresh token rotation (old token invalidated on refresh)
- CORS configured for frontend origin
- Helmet.js for security headers
- Input validation and sanitization
- SQL injection prevention via Prisma
- Rate limiting to prevent abuse

## CORS Configuration

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Version', 'Authorization']
}));
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | Environment |
| DATABASE_URL | Yes | - | PostgreSQL connection string |
| JWT_ACCESS_SECRET | Yes | - | Secret for access tokens |
| JWT_REFRESH_SECRET | Yes | - | Secret for refresh tokens |
| GITHUB_CLIENT_ID | Yes | - | GitHub OAuth client ID |
| GITHUB_CLIENT_SECRET | Yes | - | GitHub OAuth secret |
| GITHUB_CALLBACK_URL | Yes | - | OAuth callback URL |
| FRONTEND_URL | Yes | - | Frontend application URL |

## CLI Commands for Testing

```bash
# Test authentication
curl -X GET http://localhost:3000/auth/github

# Test profile list with version header
curl -X GET http://localhost:3000/api/profiles \
  -H "X-API-Version: 1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test search
curl -X GET "http://localhost:3000/api/profiles/search?q=young males from Nigeria" \
  -H "X-API-Version: 1"

# Test create profile (admin)
curl -X POST http://localhost:3000/api/profiles \
  -H "X-API-Version: 1" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","gender":"male","age":30}'
```

## Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Using PM2

```bash
pm2 start dist/app.js --name insighta-api
pm2 save
pm2 startup
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

## Troubleshooting

### Common Issues

**Issue:** `X-API-Version header required`

**Solution:** Add header to all API requests:
```http
X-API-Version: 1
```

**Issue:** `401 Unauthorized`

**Solution:** Token expired. Call `/auth/refresh` or re-authenticate.

**Issue:** `403 Forbidden`

**Solution:** User role insufficient or account inactive.

**Issue:** CORS errors

**Solution:** Verify `FRONTEND_URL` matches your frontend origin.

## GitHub Actions CI/CD

```yaml
name: CI/CD
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

## License

Proprietary - Insighta Labs+ Internal Use

## Version

API Version: 1.0.0