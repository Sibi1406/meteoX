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

powered by [Open-Meteo](https://open-meteo.com) under CC BY 4.0. AI explanations powered by Google Gemini API.
