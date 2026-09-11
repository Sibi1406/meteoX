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
                 Cloud Functions (Node.js 20)
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
                                  Feedback ("Did it rain?")
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
* **Backend**: Firebase Cloud Functions Gen 2 (Node.js 20), Firebase Admin SDK.
* **Database & Caching**: Cloud Firestore (15-minute TTL cache, user profiles, trust scores, role rules, alerts, logs).
* **Authentication**: Firebase Authentication (Phone SMS OTP, Google Sign-In, Anonymous Guest Mode).
* **AI / LLM**: Google Gemini API (`gemini-2.0-flash`) with structured JSON schema and strict grounding verifier.
* **Weather Data**: Open-Meteo Forecast API (Real-time, Keyless, 0-cost).
* **Languages**: English (`en`) and Tamil (`ta`) bilingual interface with Bhashini adapter interface.
* **Alerts**: Firebase Cloud Messaging (FCM), with role-based vulnerability filtering.

---

## 3. Directory Structure

```text
weathergpt/
├── README.md
├── firebase.json
├── .firebaserc
├── firestore.rules
├── firestore.indexes.json
│
├── functions/
│   ├── package.json
│   ├── index.js
│   ├── admin.js
│   │
│   ├── lib/
│   │   ├── config.js
│   │   ├── query/
│   │   │   ├── queryProcessor.js
│   │   │   ├── queryUnderstanding.js
│   │   │   └── intent.js
│   │   ├── weather/
│   │   │   ├── weather.js
│   │   │   ├── openMeteo.js
│   │   │   ├── aggregator.js
│   │   │   ├── validator.js
│   │   │   └── cache.js
│   │   ├── rag/
│   │   │   ├── retrieval.js
│   │   │   ├── context.js
│   │   │   └── contextBuilder.js
│   │   ├── ai/
│   │   │   ├── gemini.js
│   │   │   ├── advisory.js
│   │   │   └── grounding.js
│   │   ├── advisory/
│   │   │   ├── roleRules.js
│   │   │   ├── farmer.js
│   │   │   ├── fisherman.js
│   │   │   ├── cityAdmin.js
│   │   │   └── general.js
│   │   ├── language/
│   │   │   ├── bhashini.js
│   │   │   └── translation.js
│   │   ├── feedback/
│   │   │   ├── feedback.js
│   │   │   ├── groundTruth.js
│   │   │   └── calibration.js
│   │   ├── alerts/
│   │   │   ├── detection.js
│   │   │   ├── vulnerability.js
│   │   │   └── personalization.js
│   │   └── utils/
│   │       ├── geo.js
│   │       ├── logger.js
│   │       └── validation.js
│   │
│   └── test/
│       ├── weather.test.js
│       ├── query.test.js
│       ├── grounding.test.js
│       ├── feedback.test.js
│       └── alerts.test.js
│
├── web/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── manifest.json
│   │   ├── icon-192.svg
│   │   └── icon-512.svg
│   │
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── firebase.js
│       ├── api.js
│       ├── i18n/
│       │   ├── translations.js
│       │   └── LanguageContext.jsx
│       ├── hooks/
│       │   ├── useAuth.js
│       │   └── useProfile.js
│       ├── components/
│       │   ├── Login.jsx
│       │   ├── RoleSelect.jsx
│       │   ├── LocationSelect.jsx
│       │   ├── LanguageSelect.jsx
│       │   ├── Chat.jsx
│       │   ├── ChatMessage.jsx
│       │   ├── WeatherCard.jsx
│       │   ├── AdvisoryCard.jsx
│       │   ├── TrustScore.jsx
│       │   ├── AlertCard.jsx
│       │   ├── Feedback.jsx
│       │   └── Loading.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Dashboard.jsx
│       │   ├── ChatPage.jsx
│       │   └── Profile.jsx
│       └── styles/
│           └── index.css
│
└── scripts/
    └── seedDemoData.js
```

---

## 4. Firestore Collections & Schema

1. **`users/{userId}`**: User profile with role (`farmer`, `fisherman`, `city_admin`, `general`, `researcher`), district cluster, GPS coordinates, preferred language, and FCM token.
2. **`weather_cache/{geohash}`**: Cached Open-Meteo response with 15-minute TTL (`createdAt`, `updatedAt`, `expiresAt`).
3. **`forecast_records/{forecastId}`**: Tracked predictions saved automatically on every cache fetch to compare against subsequent feedback.
4. **`weather_observations/{obsId}`**: Ground truth records explicitly distinguishing official AWS stations from citizen crowdsourced reports.
5. **`feedback/{feedbackId}`**: User feedback responses ("YES, it rained" / "NO rain") linked to district clusters.
6. **`trust_scores/{clusterId}`**: District-level self-calibrated scores (`accuracyScore`, `regionalBias`, `trustScore`, `sampleCount`, `confidenceLevel`).
7. **`role_rules/{role}`**: Agronomic and livelihood rules governing fertilizer delays, pesticide spraying during high wind, marine sea safety, and urban drainage.
8. **`alerts/{alertId}`**: Active threshold weather alerts (heavy rain >= 20mm, high wind >= 38 km/h, extreme heat >= 38°C).
9. **`alert_deliveries/{deliveryId}`**: Audit trail of personalized alerts delivered to user devices.
10. **`query_logs/{queryId}`**: Full audit log of user questions, retrieved facts, and Gemini grounding validation status.

---

## 5. Local Setup & Testing

### Step 1: Install Dependencies
```bash
# In functions
cd functions
npm install

# In web frontend
cd ../web
npm install
```

### Step 2: Run Automated Tests
```bash
cd functions
npm test
```
Runs 19 automated unit tests verifying:
* Physical weather range validation & Open-Meteo normalization
* English & Tamil query understanding (`"நாளைக்கு மழை பெய்யுமா?"`, `"நாளைக்கு உரம் போடலாமா?"`)
* Gemini Grounding Verification & Hallucination detection
* Calibration thresholds (0-5 insufficient, 6-20 low confidence, 21+ usable)
* Severe weather threshold detection & role-based vulnerability filtering

### Step 3: Seed Demo Data
```bash
node scripts/seedDemoData.js
```

### Step 4: Run React Frontend Dev Server
```bash
cd web
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. Critical End-to-End Demo Flow (Spec §51)

1. **Sign In**: Choose Phone OTP, Google Sign-In, or instant **Guest / Demo** mode.
2. **Role Selection**: Select **Farmer (விவசாயி)** and choose **Coimbatore** district (or detect GPS).
3. **Switch to Tamil**: Click the **தமிழ்** language toggle in the top bar.
4. **Ask Weather Query**:
   * Type or click: `"நாளைக்கு மழை பெய்யுமா?"`
   * View retrieved Open-Meteo facts (Rain probability: 80%, Temp: 29°C), Grounding Check PASSED badge, and Tamil response.
5. **Ask Agronomic Advisory Query**:
   * Type: `"நாளைக்கு உரம் போடலாமா?"`
   * See grounded agricultural advice: `"கனமழை எதிர்பார்க்கப்படுவதால் உரம் இடுவதை தள்ளிப்போடவும்."` (Do not spray fertilizer, rain will wash it away).
6. **Submit Ground Truth Feedback**:
   * Click **"👍 ஆம், மழை பெய்தது" (YES, it rained)** under the forecast.
   * Watch the **Local Forecast Reliability Score** immediately recalculate and update in the UI.
7. **Simulate Severe Weather Alert**:
   * Click **"⚡ மாதிரி எச்சரிக்கையை இயக்கு (Trigger Simulated Alert)"** in the dashboard to demo threshold detection and safety advisory.

---

## 7. Status of Integrations & Stubs (Spec §36, §37)

| Feature | Implementation Status | Notes |
|---|---|---|
| Open-Meteo Weather API | **Real (Live)** | Keyless, real-time forecast & precipitation data |
| Gemini 2.0 Flash AI | **Real (Live)** | Grounded prompt, strict JSON schema, `MAX_REGENERATIONS=2` |
| Grounding Verifier | **Real (Live)** | Rejects hallucinated numbers, ungrounded percentages & fake trust scores |
| Firestore TTL Cache | **Real (Live)** | 15-minute caching to eliminate duplicate API requests |
| Feedback & Calibration | **Real (Live)** | Immediate and nightly batch recalibration |
| Tamil & English i18n | **Real (Live)** | Complete bilingual UI dictionary and intent parser |
| Bhashini Translation | **Adapter Ready (Stub)** | Ready to connect live ULCA API once credentials approved |
| FCM Push Alerts | **Real (Live)** | Role-vulnerability filtering & personalized payloads |
| WhatsApp & SMS | **Adapter Ready (Stub)** | Clean interface returning `NOT_CONFIGURED` without errors |
| IMD / GFS | **Adapter Ready (Stub)** | Phase 2 adapters ready for future national radar feeds |

---

## 8. License & Acknowledgements
Built for the WeatherGPT Hackathon challenge. Meteorology data powered by [Open-Meteo](https://open-meteo.com) under CC BY 4.0. AI explanations powered by Google Gemini API.
