---
description: How to submit the Revesta mobile app to the Google Play Store
---

# Google Play Store Submission Guide

Follow these steps to build and submit your app for approval.

## 1. Prerequisites
- A **Google Play Developer Account** ($25 one-time fee).
- You must have `eas-cli` installed locally: `npm install -g eas-cli`.
- Login to Expo: `eas login`.

## 2. Generate the Production Build
Run this command in the `mobile` directory:
```bash
eas build --platform android --profile production
```
- Select "Yes" to all prompts (Expo will handle your keystores/credentials).
- Once finished, you will receive a link to download the `.aab` file.

## 3. Play Console Setup
1. Go to [Google Play Console](https://play.google.com/console).
2. Click **Create app** and fill in the details (Name: Revesta, Language: English, etc.).
3. Complete the **Initial Setup** tasks (Privacy policy, Data safety, category).

## 4. Upload & Submit
1. Navigate to **Production** > **Create new release**.
2. Upload the `.aab` file you downloaded from Expo.
3. Add release notes.
4. Click **Next** and then **Start rollout to Production**.

## 5. Review Process
- Google usually takes **2-7 days** to review the first version.
- Watch your email for any rejection reasons (usually regarding permissions or privacy policy).
