# KS Finance performance report

## Findings

- MongoDB already used one Motor client in FastAPI lifespan. It was not reconnecting per request. Pool sizing and wait/selection/socket timeouts were implicit, and shutdown did not clear the stored client.
- `/api/people` executed **1 + 2N queries**: one list, then history and selected-month queries per person. For the 23 people observed in the hosted response, that is 47 queries. History documents were transferred into Python to calculate four statistics.
- Dashboard loading also fetched the entire people list solely for onboarding. The backend dashboard loaded full people and monthly documents into Python for totals.
- Monthly/history indexes existed, including the unique `(person_id, year, month)` index. Compound indexes for active-person sorting and `(year, month)` filtering were missing from the inspected live database.
- Search ran a request per keystroke, interpreted user text as a regular expression, and had no response-order protection. People listing was unbounded.
- Export libraries were imported at startup, and PDF/Excel rendering ran synchronously inside async routes. Reports were already generated only on explicit export requests.
- Render's blueprint specifies Free, one Uvicorn process, and no region. The actual service plan and Render/Atlas regions cannot be established from the repository; no region is inferred from hostnames.

## Implemented changes

1. Retained one async client, with configurable minimum 1 / maximum 20 pooled connections per process; 5-second connection, selection and pool-wait limits; 15-second socket timeout. Lifespan closes resources even on shutdown errors.
2. Added query-specific indexes without dropping existing indexes. Startup creates indexes by default for safe first deployment; after installation, an environment switch allows startup to do just a ping. Export imports are lazy.
3. Replaced people N+1 queries with one people query and one grouped statistics aggregation. A single-person details request now aggregates that person's statistics in MongoDB without transferring history documents.
4. Dashboard uses two concurrent aggregations returning at most two summary documents. Selected-month records join people by their indexed ID; active-person rules, record-specific expected amounts, share counts, pending and percentage formulas remain intact. Decimal intermediate expected-amount sums avoid cancellation when a small amount replaces a very large default; API fields remain numbers.
5. Monthly report queries use field projections and run concurrently. Person-name joins retrieve only names and IDs. Export rendering runs in the thread pool so it does not directly block the event loop. Large JSON responses support gzip.
6. Added backward-compatible optional people pagination. The mobile people screen requests 20 rows and loads additional pages on scrolling. Literal substring search is debounced by 300 ms. An older request cannot overwrite a newer people/dashboard/monthly selection.
7. Dashboard's additive `has_any_people` field removes the extra people request, including correct onboarding behavior when all people are inactive. Old backend responses have a compatibility fallback.
8. Added `/api/people/options` for the complete active-person picker, returning only IDs and names with one projected query. Editing a payment loads the picker and record concurrently.
9. Identical in-flight GETs share a promise. Completed financial data is never cached. Writes invalidate pending-read reuse; no TTL cache, Redis or retry loop was added. Existing focus/CRUD refresh behavior remains.
10. Added static skeleton placeholders, sanitized timing logs and `Server-Timing`. `/health` stays database-free; `/health/db` separately pings MongoDB. Production access logs are disabled so query strings are not duplicated in logs.
11. Removed test-only dependencies from the production requirements; they remain in `requirements-dev.txt`.

## Actual measurements

Measurements were made on 13 September 2026. These are small sequential samples, not load-test percentiles or latency guarantees. JSON files beside this report retain first-request and warm values. A first request is not automatically a proven Render cold start.

### Existing hosted Render API (before deployment)

`benchmark-remote-before.json`, two warm samples per successful endpoint, measured from the development computer:

| Endpoint | First request | Warm median |
|---|---:|---:|
| `/health` | Read timeout at 30 seconds | Not measured in this run |
| `/api/people` | 13,068 ms | 11,265 ms |
| `/api/dashboard?month=9&year=2026` | 757 ms | 751 ms |
| `/api/monthly-records?month=9&year=2026` | 819 ms | 728 ms |
| `/api/people/{id}` | 747 ms | 721 ms |

The first health timeout followed by successful requests is consistent with a wake-up delay, but no Render startup logs were available to prove its cause. The slow warm people endpoint is separate evidence of the application's N+1 bottleneck.

### Updated local backend using the real Atlas database

`benchmark-atlas-local-after.json`, three warm samples. Read-only ASGI requests used the existing Atlas database with **no index creation or data writes**:

| Endpoint | First request | Warm median |
|---|---:|---:|
| `/health` | 17.24 ms | 1.60 ms |
| `/api/people` | 1,058.58 ms | 166.21 ms |
| `/api/dashboard?month=9&year=2026` | 455.06 ms | 79.51 ms |
| `/api/monthly-records?month=9&year=2026` | 142.82 ms | 160.55 ms |
| `/api/people/{id}` | 160.64 ms | 161.48 ms |

These exclude Render scheduling, Render-to-Atlas latency and the phone's network. **Do not compare these numbers with the hosted table as a production speedup ratio.** A hosted after-deployment benchmark is still required. The initial people request includes establishing the database connection; the pool is reused afterward.

### Synthetic before/after

`benchmark-before.json` and `benchmark-after.json` use the same isolated fixture: 50 synthetic people, 600 records, ASGI in-process and mongomock. They do not touch Atlas. See the machine-readable files for all timings. Mongomock does not implement real query plans or indexes and evaluates aggregation in Python; dashboard and person-detail aggregation can be slower there even though the real Atlas measurements are faster. These results are correctness/local-overhead evidence, not production database benchmarks.

| Endpoint | Before warm median | After warm median |
|---|---:|---:|
| Health | 0.57 ms | 1.21 ms |
| People, unpaginated | 270.79 ms | 67.33 ms |
| Dashboard | 6.42 ms | 46.76 ms |
| Monthly records | 9.29 ms | 7.99 ms |
| Person details | 4.06 ms | 25.84 ms |

The increased mock dashboard/details timings are retained here rather than presented as a universal improvement. Aggregation trades Python mock execution overhead for fewer transferred documents and database-side calculation; hosted deployment measurements are the final acceptance check.

### Read-only query profiling

`benchmark-mongo-profile.json` records the existing live indexes before deployment. Initial connection plus ping was 906.6 ms; a warm ping was 53.85 ms **from this development computer**, not from Render.

- Active-person sorted query: 23 documents examined/returned, no index chosen, 0 ms server execution at this tiny size.
- Selected-month query: existing `year_1` index; one key/document examined and returned; 0 ms server execution.
- Person history: existing unique person/year/month index; one key/document examined and returned; 1 ms server execution.

These low server execution times do not include network round trips. New index effectiveness and aggregate plans must be rechecked after index deployment and as the dataset grows.

## Deployment and database changes

Deploy the backend first, then rebuild the APK. Existing API response fields remain available. The mobile picker requires the new `/api/people/options` route; pagination requires the updated backend.

Use one worker on the small Render service:

```sh
uvicorn app.main:app --host 0.0.0.0 --port $PORT --no-access-log
```

Keep `MONGODB_CREATE_INDEXES_ON_STARTUP=true` for the first successful deployment. Added indexes:

| Collection | Index | Purpose |
|---|---|---|
| `people` | `(status ASC, name ASC, _id ASC)` | Active-person filtering and stable ordered pages/options |
| `people` | `(name ASC, _id ASC)` | Stable unfiltered people pages |
| `monthly_records` | `(year ASC, month ASC)` | Month filtering and reverse chronological traversal |

The existing unique `(person_id ASC, year ASC, month ASC)` rule and existing single-field indexes remain. Index creation was verified with the mock database, but new indexes were **not applied to live Atlas during this task**. Startup waits for index creation intentionally so uniqueness guarantees are not bypassed. After installation, setting the flag to `false` avoids index creation checks on subsequent restarts. Use `python scripts/create_indexes.py` for future explicit index installation.

The pool/environment variables are documented in `.env.example`. No secrets were added to frontend code or benchmark output. No live credentials, database regions or paid plans were changed.

Check the actual Atlas and Render regions in their dashboards and place them nearby when planning a move. Free Render instances sleep after inactivity; an always-on plan addresses that platform limitation. No application optimization eliminates a stopped instance's wake-up time. See [Render's Free service documentation](https://render.com/docs/free) and [MongoDB connection-pool documentation](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/connection-options/connection-pools/).

## Reproduction and validation

From `backend/`:

```sh
python -m pip install -r requirements-dev.txt
python -m pytest -q -p no:cacheprovider
python scripts/benchmark_api.py --output benchmark-local.json
python scripts/benchmark_api.py --atlas --output benchmark-atlas.json
python scripts/benchmark_api.py --url https://YOUR-SERVICE.onrender.com --output benchmark-hosted.json
python scripts/profile_mongo.py
```

The default benchmark seeds only mongomock. `--atlas`, remote URL benchmarking and profiling are read-only. They omit customer documents and URI values from output. To investigate cold starts, run the remote benchmark after a known idle interval and correlate it with Render startup logs. Compare external elapsed time with `Server-Timing`; the difference includes network/proxy/wake-up costs, while the header includes application and database waits.

Validation covers person/payment CRUD, paid/pending/partial status, active/inactive and empty dashboards, count multipliers, overpayments, record overrides, financial refresh after writes, literal search, paging, one statistics aggregation per people list, index uniqueness, connection reuse, sanitized logs, date preservation and all four PDF/Excel export endpoints. Excel files are opened with openpyxl; PDF response signatures are checked. A blocking test renderer confirms `/health` remains responsive while export runs in another thread.

Final result: **46 backend tests passed**, **3 frontend tests passed**, TypeScript passed, and Android/iOS/web bundle exports passed. `git diff --check` passed.

Frontend checks: `node --test tests/api.test.cjs`, TypeScript `--noEmit`, and Expo offline exports for Android, iOS and web. These verify JS/native bundles, not an installed APK or a visual/device interaction test. Existing ReportLab emits a deprecation warning; tests pass.

## Remaining limitations

- Updated code has not been deployed to Render, and the APK has not been rebuilt/installed. Post-deployment warm/cold timings and startup index creation remain to be verified.
- Actual region placement and the live Render plan are unconfirmed. The repository blueprint specifies Free only.
- Case-insensitive substring search preserves expected name/phone behavior but cannot generally use a normal B-tree name index. Debouncing, bounded pages and escaped literal text control cost for this small dataset. A much larger dataset may need dedicated search indexing.
- The payment picker intentionally retains the complete active-person list with minimal fields. Legacy unpaginated API calls and full-history exports remain available for compatibility.
- Export work shares the service's CPU/memory despite running outside the event loop. Threading is suitable for occasional reports; it is not isolation from arbitrarily large simultaneous exports.
- No financial response cache was introduced. Network latency, first pool establishment and Render wake-up remain observable.

## Files changed

Performance implementation and documentation:

- `backend/.env.example`
- `backend/app/config.py`
- `backend/app/database/mongodb.py`
- `backend/app/main.py`
- `backend/app/routes/dashboard.py`
- `backend/app/routes/monthly_records.py`
- `backend/app/routes/people.py`
- `backend/app/routes/reports.py`
- `backend/app/services/finance_service.py`
- `backend/pytest.ini`
- `backend/render.yaml`
- `backend/requirements.txt`
- `backend/RENDER.md`
- `backend/PERFORMANCE.md`
- `backend/scripts/benchmark_api.py`
- `backend/scripts/create_indexes.py`
- `backend/scripts/profile_mongo.py`
- `backend/tests/test_database_lifecycle.py`
- `backend/tests/test_performance_regressions.py`
- `backend/benchmark-before.json`
- `backend/benchmark-after.json`
- `backend/benchmark-remote-before.json`
- `backend/benchmark-atlas-local-after.json`
- `backend/benchmark-mongo-profile.json`
- `frontend/README.md`
- `frontend/src/components/LoadingView.tsx`
- `frontend/src/screens/AddMoneyScreen.tsx`
- `frontend/src/screens/DashboardScreen.tsx`
- `frontend/src/screens/MonthlyFinanceScreen.tsx`
- `frontend/src/screens/PeopleScreen.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/types/index.ts`
- `frontend/tests/api.test.cjs`
- `docs/API_DOCUMENTATION.md`

Earlier payment-date changes remain in `backend/tests/test_monthly_records.py` and `frontend/src/utils/format.ts`; those files were not modified by this performance task. The earlier changes in `finance_service.py` and `AddMoneyScreen.tsx` were retained while optimizing them.
