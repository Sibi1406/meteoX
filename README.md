# MeteoX — Multilingual, Role-Aware Grounded Weather & Climate Intelligence Platform

> **Real weather APIs provide facts. Firestore caches and logs them. Structured RAG retrieves weather, local trust, and role rules. Gemini explains the retrieved facts. Gemini NEVER independently predicts or invents weather. User feedback continuously calibrates local forecast reliability.**

---

## 1. Project Overview & Core Architecture

MeteoX is an advanced meteorological platform designed for farmers, fishermen, municipal authorities, and citizens across India (with primary focus on Tamil Nadu agriculture and coastal communities). 

### The Core Architectural Pipeline

```text
                         USER
                           │
                           ▼
                    React PWA (Mobile-First)
                           │
                           ▼
             Firebase Auth (Phone OTP, Google, Guest)
                           │
                           ▼
                 Cloud Functions (Node.js 22)
                           │
                           ▼
                 Query Understanding (EN & TA Intent & Dates)
                           │
                 ┌─────────┴─────────┐
                 │                   │
             Cache HIT           Cache MISS
                 │                   │
                 ▼                   ▼
             Firestore          Open-Meteo API
                                     │
                                     ▼
                               Normalize (Physical schema)
                                     │
                               Validate (0-100% ranges)
                                     │
                                     ▼
                                 Firestore (TTL Cache)
                                     │
                                     ▼
                              RAG Retrieval
                           ┌─────────┼─────────┐
                           │         │         │
                        Weather    Trust     Role Rules
                           │         │         │
                           └─────────┼─────────┘
                                     ▼
                              Context Builder
                                     │
                                     ▼
                         Grounded Gemini LLM
                                     │
                                     ▼
                      Grounding Verification (MAX_RETRY = 2)
                              /          \
                           FAIL           PASS
                            │               │
                            └── Regenerate  ▼
                                        Response
                                           │
                                           ▼
                                Language Layer (EN / தமிழ்)
                                           │
                                           ▼
                                         USER
                                           │
                                           ▼
                                      Feedback ("Was the forecast accurate?")
                                           │
                                           ▼
                                  Local Calibration
                                           │
                                           ▼
                                  District Trust Score
                                           │
                                           └──────► Future RAG Context
```

---

## 2. Technology Stack

* **Frontend**: React 18, Vite, React Router 6, PWA (Manifest & Mobile App Shell), Responsive CSS.
* **Backend**: Firebase Cloud Functions Gen 2 (Node.js 22), Firebase Admin SDK.
* **Database & Caching**: Cloud Firestore (15-minute TTL cache, user profiles, trust scores, role rules, alerts, logs).
* **Authentication**: Firebase Authentication (Phone SMS OTP, Google Sign-In, Anonymous Guest Mode).
* **AI / LLM**: Google Gemini API (`gemini-3.6-flash`) with structured JSON schema and strict grounding verifier.
* **Weather Data**: Open-Meteo Forecast API (Real-time, Keyless, 0-cost).
* **Languages**: English (`en`) and Tamil (`ta`) bilingual interface with Bhashini adapter interface.
* **Alerts**: Firebase Cloud Messaging (FCM), with role-based vulnerability filtering.

Gemini quota errors are not retried; advisory requests fall back to varied, deterministic wording using the retrieved weather context. The connection diagnostic is `node scripts/testGemini.js` from `functions/` and reads the ignored `functions/.env` file.

## 3. Database Maintenance

Demo data and duplicate query logs can be inspected with the dry-run cleanup script:

```bash
node scripts/cleanupDatabase.js --project meteox-9d084
```

The script never deletes by default. Review its collection audit and document samples before adding `--confirm`:

```bash
node scripts/cleanupDatabase.js --project meteox-9d084 --confirm
```

Run individual maintenance targets with `--only demo`, `--only query-logs`, `--only weather-cache`, or `--only test-users`. The weather-cache threshold can be changed with `--older-than-minutes 60`.

For test-user cleanup, provide only the Firebase Authentication testing phone numbers explicitly:

```bash
node scripts/cleanupDatabase.js --project meteox-9d084 --only test-users --test-phones "+919876543210,+919876543211"
```

The script requires `--project` to match the active `GCLOUD_PROJECT` or `firebase use` project. It uses paginated Firestore reads and 400-document batches. Verify Firestore TTL policies in the Firebase Console before relying on manual weather-cache pruning.

## 4. Forecast Evidence & Operations

`forecast_tracks` snapshots are district-centroid forecasts, while an individual dashboard forecast is for the user's coordinates. The daily verification uses Open-Meteo's own past-weather model analysis as a proxy, not a rain-gauge observation; farmer reports take precedence when a non-tied majority exists. The shared wet-day threshold is defined once in `functions/lib/weatherThresholds.json` and displayed from that value in the UI. Open-Meteo's hourly precipitation probability is the probability of more than 0.1 mm in the preceding hour, so verification uses an explicit common wet-day convention instead of treating those thresholds as identical.

Action-window thresholds are deterministic starting points, not locally validated agronomic or marine-safety guidance. A Tamil Nadu agriculture officer should tune the farming thresholds before operational use. Always follow official marine and weather warnings.

The scheduled jobs make approximately 342 Open-Meteo requests per day for 38 districts (four snapshot runs with two requests per district, plus one verification request per district). The free Open-Meteo service is for non-commercial use; confirm the applicable terms or use a suitable commercial plan before commercial deployment.

For a clearly marked demo history only, run `node functions/scripts/seedTrackRecord.js [districtClusterId]`. Seeded records carry `isDemo: true` and must not be presented as live verification.

---

powered by [Open-Meteo](https://open-meteo.com) under CC BY 4.0. AI explanations powered by Google Gemini API.
