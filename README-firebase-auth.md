# Firebase Authentication Setup

To enable Google, Discord, and Email/Password login for the Character Vault, you must enable these providers in your Firebase Console.

## 1. Enable Authentication
1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Select your project (`master-app-ee17a`).
3. Click on **Authentication** in the left sidebar, then click **Get Started**.
4. Go to the **Sign-in method** tab.

## 2. Enable Email/Password
1. Click **Add new provider** and select **Email/Password**.
2. Toggle the "Enable" switch and click **Save**.

## 3. Enable Google Sign-In
1. Click **Add new provider** and select **Google**.
2. Toggle the "Enable" switch.
3. Select your support email from the dropdown and click **Save**.

## 4. Enable Discord (Custom OAuth)
Discord requires a bit more setup since it's a custom OAuth provider.
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**, name it (e.g., "Companion App"), and go to the **OAuth2** tab.
3. Copy the **Client ID** and **Client Secret**.
4. Back in the **Firebase Console**, click **Add new provider**.
5. Select **Custom provider** -> **OpenID Connect (OIDC)** (or just **OAuth** depending on your Firebase tier, but standard Custom OAuth is usually available).
   - *Note: If your Firebase tier does not support OIDC, you can use a Firebase Function to handle Discord auth, but we are using the `OAuthProvider('discord.com')` assumption here which works with Firebase Identity Platform.*
6. Set the Provider ID to `discord.com`.
7. Paste your **Client ID** and **Client Secret** from Discord.
8. Firebase will give you a **Callback URL** (e.g., `https://master-app-ee17a.firebaseapp.com/__/auth/handler`).
9. Go back to the **Discord Developer Portal**, add this URL to your **Redirect URIs**, and save.

## 5. Enable Anonymous Auth (Optional fallback)
1. Ensure **Anonymous** is still enabled if you want guests to try the app before signing up.
