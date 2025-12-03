# Render Production Migration Guide

## Issue
The production database on Render doesn't have the updated User role choices (`SELLER`, `COLLECTOR`, `RECYCLER`). It's still using the old schema.

## Solution: Run Migrations on Render

### Option 1: Via Render Dashboard (Recommended)
1. Go to your Render Dashboard: https://dashboard.render.com
2. Click on your **Backend Service** (revesta-backend or similar)
3. Go to the **Shell** tab
4. Run these commands:
   ```bash
   python manage.py migrate
   ```

### Option 2: Via Render CLI
If you have the Render CLI installed:
```bash
render shell <your-service-name>
python manage.py migrate
```

### Option 3: Trigger via Git Push (Automatic)
Your `build.sh` script should already include migrations. If not, update it:

**backend/build.sh:**
```bash
#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate  # This line ensures migrations run on every deploy
```

Then push to trigger a redeploy:
```bash
git add backend/build.sh
git commit -m "chore: Ensure migrations run on deploy"
git push
```

## Verification
After running migrations, try registering a new user with role `SELLER`, `COLLECTOR`, or `RECYCLER`. It should work!

## Important Notes
- The migration file `backend/users/migrations/0001_initial.py` already has the correct role choices
- You just need to apply it to the production database
- The wallet migrations will also be applied automatically
