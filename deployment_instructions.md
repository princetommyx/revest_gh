# Render Deployment Configuration Guide

## 1. Create New Web Service
Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** -> **Web Service**.

## 2. Connect Repository
Select your repository: `revest_gh`

## 3. Configure Details
Fill out the form with these exact values:

| Field | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `revesta-backend` | Or any name you like |
| **Region** | `Frankfurt (EU Central)` | Or `Ohio (US East)` - choose closest to you |
| **Branch** | `main` | |
| **Root Directory** | `backend` | **Important**: This tells Render to look inside the backend folder |
| **Runtime** | `Python 3` | |
| **Build Command** | `./build.sh` | This runs our script to install requirements & migrate DB |
| **Start Command** | `daphne -b 0.0.0.0 -p $PORT revesta_backend.asgi:application` | Uses Daphne for WebSockets |
| **Instance Type** | `Free` | |

## 4. Environment Variables
Scroll down to "Environment Variables" and add these:

| Key | Value |
| :--- | :--- |
| `PYTHON_VERSION` | `3.11.5` |
| `SECRET_KEY` | `(Generate a random string)` |
| `DEBUG` | `False` |
| `DATABASE_URL` | *(See Step 5)* |
| `REDIS_URL` | *(See Step 6)* |

## 5. Database Setup (PostgreSQL)
1. Open a new tab in Render.
2. Click **New +** -> **PostgreSQL**.
3. Name: `revesta-db`.
4. Region: **Same as Web Service**.
5. Plan: `Free`.
6. Create it.
7. Copy the **Internal Database URL** and paste it into your Web Service's `DATABASE_URL` variable.

## 6. Redis Setup (Redis)
1. Open a new tab in Render.
2. Click **New +** -> **Redis**.
3. Name: `revesta-redis`.
4. Region: **Same as Web Service**.
5. Plan: `Free`.
6. Create it.
7. Copy the **Internal Redis URL** and paste it into your Web Service's `REDIS_URL` variable.

## 7. Finish
Click **Create Web Service**. Watch the logs!

---

# Vercel Deployment (Frontend)

1. Go to [vercel.com](https://vercel.com/new).
2. Import `revest_gh`.
3. **Framework Preset**: `Vite`.
4. **Root Directory**: Click "Edit" and select `frontend`.
5. **Environment Variables**:
   - `VITE_API_URL`: `https://revesta-backend.onrender.com/api/` (Replace with your actual Render URL)
6. Click **Deploy**.
