---
name: scalability
description: Design and build scalable software systems. Use when writing database queries, caching logic, API endpoints, message queues, background jobs, connection pools, load balancing, microservices, or when reviewing code for performance bottlenecks. Covers database scaling, caching strategies, async processing, API design for scale, concurrency, frontend performance, observability, and infrastructure patterns. On Revesta specifically, load this before pagination, rate limiting, caching, background jobs/queues, indexing, query optimization, N+1 fixes, connection pooling, read replicas, sharding, deployment strategy, autoscaling, CDN caching, or observability decisions - even if the user just says something is "slow," asks how to "handle more users," or reports timeouts/high DB load, without naming any of these techniques explicitly.
argument-hint: [area to scale or optimize]
---

# Software Scalability

You are an expert at building systems that handle growth without rewriting. You focus on identifying real bottlenecks before optimizing, and you choose the simplest solution that solves the actual problem.

Read the detailed reference files in `${CLAUDE_SKILL_DIR}` for comprehensive patterns:

- `database-scaling.md` — Indexing, query optimization, connection pooling, read replicas, partitioning, sharding, N+1 prevention
- `caching-and-queues.md` — Redis patterns, cache invalidation, message queues, async processing, event-driven architecture
- `api-and-services.md` — Pagination, rate limiting, circuit breakers, graceful shutdown, load balancing, stateless design
- `infrastructure.md` — Kubernetes autoscaling, serverless patterns, CDN caching, deployments, health checks, observability

## The Scalability Mindset

**Rule #1: Don't optimize what you haven't measured.** Profile first, then fix the actual bottleneck.

### Bottleneck Identification Flow

```
Slow response times?
  ↓
Where is time spent?
  ├─ Database (>50% of request time) → See database-scaling.md
  │   ├─ Missing index → Add targeted index
  │   ├─ N+1 queries → Use eager loading / joins
  │   ├─ Full table scans → Add WHERE clauses, pagination
  │   └─ Connection exhaustion → Add connection pooling
  ├─ External API calls → See api-and-services.md
  │   ├─ Slow downstream → Add caching or circuit breaker
  │   └─ Too many calls → Batch or queue
  ├─ CPU-bound computation → See infrastructure.md
  │   ├─ Can parallelize → Worker threads / cluster mode
  │   └─ Can defer → Move to background queue
  └─ Memory pressure → Profile allocations
      ├─ Large payloads → Stream instead of buffer
      └─ Memory leaks → Heap snapshot analysis
```

## Quick Wins — The 80/20 of Scaling

These solve most scaling problems before you need anything complex:

### 1. Add the Right Index
```sql
-- Compound index: equality fields first, then range, then sort
CREATE INDEX idx_orders_lookup
ON orders(customer_id, status, created_at DESC);

-- Partial index: index only what you query
CREATE INDEX idx_active_users
ON users(email) WHERE status = 'active';
```

### 2. Fix N+1 Queries
```typescript
// BAD: 1 + N queries
const users = await prisma.user.findMany();
for (const u of users) u.posts = await prisma.post.findMany({ where: { authorId: u.id } });

// GOOD: 2 queries total
const users = await prisma.user.findMany({ include: { posts: true } });
```

### 3. Add Caching Where It Matters
```typescript
async function getUser(id: string) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.user.findUnique({ where: { id } });
  await redis.setex(`user:${id}`, 300, JSON.stringify(user)); // 5min TTL
  return user;
}
```

### 4. Use Cursor Pagination
```typescript
// Offset pagination degrades: O(offset + limit) — page 1000 scans 100K rows
// Cursor pagination is constant: O(limit) regardless of page

const results = await prisma.post.findMany({
  take: 20,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0,
  orderBy: { id: 'asc' }
});
```

### 5. Queue Heavy Work
```typescript
// Instead of processing inline (blocks response)
app.post('/upload', async (req, res) => {
  await queue.add('process-upload', { fileId: req.body.fileId });
  res.json({ status: 'queued' }); // Respond immediately
});
```

### 6. Connection Pooling
```
Pool size = (CPU cores × 2) + 1
4 cores → 9 connections
8 cores → 17 connections
```

## Scaling Decision Matrix

| Symptom | First Try | Then Try | Last Resort |
|---------|-----------|----------|-------------|
| Slow queries | Add indexes, fix N+1 | Read replicas, caching | Sharding |
| High DB connections | Connection pooling | PgBouncer/ProxySQL | Read replicas |
| API response time | Caching, pagination | Async processing | Microservices |
| Traffic spikes | Rate limiting, CDN | Auto-scaling (HPA) | Queue-based load leveling |
| CPU saturation | Worker threads, optimize code | Horizontal scaling | Vertical scaling |
| Memory pressure | Stream large data, fix leaks | Increase instance size | Offload to external cache |

## Thresholds — When to Act

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| p99 latency | < 200ms | 200-500ms | > 500ms |
| DB cache hit ratio | > 99% | 95-99% | < 95% |
| DB connection utilization | < 60% | 60-80% | > 80% |
| CPU utilization | < 50% | 50-70% | > 70% |
| Memory utilization | < 60% | 60-80% | > 80% |
| Error rate | < 0.1% | 0.1-1% | > 1% |
| Queue depth | Stable | Growing | Growing fast |
| Read:write ratio | N/A | > 10:1 consider replicas | > 50:1 must have replicas |

## Critical Rules

1. **Measure before optimizing** — Use EXPLAIN ANALYZE, profilers, APM tools; gut feelings are wrong
2. **Optimize the bottleneck** — 10x improvement on a non-bottleneck = 0x improvement
3. **Start simple, scale when needed** — Single DB → read replicas → sharding (not the reverse)
4. **Cache reads, queue writes** — Reads are cheap to cache; writes benefit from async processing
5. **Stateless by default** — Session state in Redis/DB, not in memory; enables horizontal scaling
6. **Fail gracefully** — Circuit breakers on external calls; timeout everything; have fallbacks
7. **Index surgically** — Every index costs write performance; only index what queries actually use
8. **Paginate everything** — No unbounded queries; cursor > offset for large datasets
9. **Pool connections** — Opening DB connections is expensive (5-50ms); reuse them
10. **Observe everything** — P99 latency, error rate, throughput, saturation; you can't fix what you can't see

Use `$ARGUMENTS` to focus on a specific scaling area. Read the relevant reference file before writing code.

---

## Revesta-specific notes

The reference files above use Node.js/TypeScript examples (Express, Prisma, TypeORM, BullMQ). Revesta's backend is **Django REST Framework + MySQL**, deployed on **Render**, already using **Redis + Django Channels** (for the real-time chat WebSocket) and **Cloudinary** (for media storage). There is currently **no background job queue** (no Celery/Django-RQ installed) — treat that as a real gap to flag, not something to silently work around.

**Translate the pattern, don't port the code.** Re-derive each technique in Django/DRF terms rather than transliterating TypeScript.

| Reference pattern (Node/TS) | Revesta equivalent (Django/DRF + MySQL) |
|---|---|
| Cursor pagination via Prisma `cursor`/`take` | DRF `CursorPagination` (order on an indexed, unique-enough field — not just `created_at` alone if many rows share a timestamp) |
| `express-rate-limit` | `django-ratelimit` or DRF `throttle_classes` (`UserRateThrottle`, `ScopedRateThrottle`) — Redis-backed via `django-redis`, already installed |
| Opossum circuit breaker | No direct equivalent installed; wrap the external call (Gemini/Paystack) with a timeout + a Redis-backed failure counter, or add `pybreaker` if this becomes a recurring problem |
| Graceful shutdown / `/health`, `/ready` | Render health checks hit a Django view — add a lightweight `/health/` endpoint that checks DB + Redis |
| Redis-backed `express-session` | Not needed — Revesta already uses JWT (`djangorestframework-simplejwt`), the stateless option these docs recommend for APIs like this |
| BullMQ `Queue`/`Worker` | **Not installed yet.** If a view needs to offload slow work (email, push, AI calls), that's a real gap. `django-rq` (reuses the existing Redis) is the cheaper first step before reaching for Celery |
| Prisma/TypeORM `include`/`leftJoinAndSelect` for N+1 | `select_related` (FK/O2O) and `prefetch_related` (reverse FK/M2M) — see `PickupRequestViewSet.filter_queryset`'s `is_rated` prefetch for a worked example already in this codebase |
| PgBouncer connection pooling | Check Render's connection limit against Django's `CONN_MAX_AGE`; MySQL connections are heavier than Postgres's, so pool sizing needs re-deriving, not copying |
| Postgres read replicas | MySQL read replicas work the same way structurally (a second `DATABASES` entry + a router) — not yet needed at Revesta's scale; confirm read:write ratio actually exceeds 10:1 first |
| `CREATE INDEX ... WHERE status = 'active'` (partial index) | MySQL has no native partial index before 8.0 functional indexes — a composite index leading with the filtered column is the practical substitute |
| Materialized views | MySQL has no native materialized views — approximate with a real table populated by a scheduled job, or lean on Redis caching instead at Revesta's current scale |
