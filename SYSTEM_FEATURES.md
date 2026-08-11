# Revesta System Features & Codebase Analysis

## 1. Project Overview
**Revesta** is a comprehensive recycling marketplace and logistics platform designed to connect everyday users, verified waste collectors, and recycling facilities. By merging an e-commerce-style marketplace with ride-hailing style logistics, Revesta incentivizes proper waste disposal, facilitates material recovery, and handles secure transactions through its integrated wallet system.

---

## 2. Current Functional Features
Based on the backend architecture and API integrations, the following core features are fully configured and functioning:

| **Feature Area** | **Details** |
| :--- | :--- |
| **User Authentication** | Secure JWT-based authentication (access/refresh tokens), user password management, role-based access control (Collectors, Sellers, Recyclers), and Google Auth integrations on client portals. |
| **Marketplace Listings** | Extensively implemented with CRUD operations. Supports searching, filtering by material type/location, pagination, and file uploads (with validation of max 5MB image sizes). |
| **Messaging System** | Direct user-to-user chat modules connecting sellers with collectors for negotiation. Includes message serializers and character limits. |
| **Wallet & Transactions** | Full virtual wallet system allowing deposits, transaction histories, withdrawals, and balance validation. Includes integration with payment gateways (Paystack). |
| **API Infrastructure** | Well-documented REST APIs hosted securely with DRF, Rate Limiting, OpenAPI (Swagger) auto-documentation, and standardized `/api/v1/` routing. |

---

## 3. Logistics & Tracking Module
The logistics system is designed similar to popular ride-hailing apps (e.g., Bolt/Uber) specifically for waste pickups. 

- **State Machine Architecture**: Pickup requests follow strict state transitions: `PENDING` → `ACCEPTED` → `ARRIVED` → `COMPLETED` (or `CANCELLED`).
- **Real-time GPS Infrastructure**: The backend accommodates continuous `lat/lon` updates using `UserLocationSerializer`. 
- **Driver / Collector Views**: Mobile clients leverage `react-native-maps` and `expo-location` to plot driver routes and manage arriving status.
- **Web App Integrations**: The frontend portal leverages `React Leaflet` and `react-use-websocket` to capture and stream real-time coordinate data for administrative or tracking purposes.

---

## 4. Tech Stack Recovery
The codebase is a modern mono-repo structure with separation of concerns across multiple platforms:

### Backend Platform
- **Framework**: Django >= 5.0 and Django REST Framework (DRF) (Python).
- **Database**: Configured mappings for PostgreSQL (via `psycopg2`) & MySQL, with Redis used for channels/caching.
- **Real-Time Integration**: Django Channels (`daphne`) handling WebSockets for chat and live tracking.
- **Documentation**: Swagger UI & Redoc powered by `drf-spectacular`.

### Mobile App (`/mobile`)
- **Framework**: React Native (0.76.7) managed by **Expo** (SDK 54).
- **Navigation & Routing**: React Navigation (Bottom Tabs & Native Stack).
- **Core Integrations**: Axios, React Native Maps, Expo Location, Firebase SDK.
- **Build Tools**: EAS CLI configured for Android/iOS builds.

### Frontend Portals (`/frontend` & `/admin`)
- **Framework**: React 19 bootstrapped with **Vite**.
- **Styling**: TailwindCSS (v4) with Framer Motion natively integrated for animations.
- **Libraries**: React Router DOM, React Leaflet (maps), and Axios.

---

## 5. Known Issues & Development Status
Based on the current scripts, artifacts, and configuration stubs, several areas appear to be actively mocked or in development:

- **EAS / Mobile Builds**: The mobile application has recent `.easignore` footprints, build scripts, and dependencies indicating recent or ongoing Android APK generation cycles.
- **Email & Domain Configurations**: Multiple troubleshooting files (`EMAIL_TROUBLESHOOTING.md`, `RESEND_DOMAIN_SETUP.md`, `GMAIL_SETUP.md`) indicate current active tuning of Resend/SMTP email deliveries.
- **Location Filtering Bugs**: Diagnostic scripts (`test_filter_bug.py`, `test_location_filtering.py`) highlight active refinement and debugging of coordinate-based filtering.
- **Payment Hooks**: Stub files (`debug_paystack.py`) and wallet scripts suggest active testing of withdrawal flows and real-money deposits via Paystack.
- **Deployment Migration**: Recent setup artifacts (`render.yaml`, `RENDER_MIGRATION_GUIDE.md`) signal an active shift or recent deployment to the Render platform.
