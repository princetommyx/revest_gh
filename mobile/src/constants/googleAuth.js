// OAuth client IDs for native Google Sign-In (expo-auth-session).
// The Android and Web client IDs are already registered in Google Cloud
// Console for this app (see google-services.json - package com.revesta.mobile,
// matching signing certificate). The backend (users/views.py GoogleLoginView)
// accepts either an ID token or a plain OAuth access token, so requesting
// just an access token here keeps this working without extra token-audience
// configuration.
export const GOOGLE_ANDROID_CLIENT_ID = '196345204120-ds6ap4upj2dm1v5l7udibdsim04hm6bv.apps.googleusercontent.com';
export const GOOGLE_WEB_CLIENT_ID = '132479987352-q4qc0odon0kcvb1vbs5gb8m385soge6v.apps.googleusercontent.com';

// No iOS OAuth client has been registered yet (there's no GoogleService-Info.plist
// in this repo). Register one in Google Cloud Console for bundle ID
// com.revesta.mobile (iOS client type, no secret needed) and set it here to
// enable native Google Sign-In on iOS - until then the iOS button shows a
// "coming soon" message instead of attempting a flow that can't complete.
export const GOOGLE_IOS_CLIENT_ID = null;
