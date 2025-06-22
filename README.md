# UniEXP

A mobile app for students, built with React Native and Expo, featuring event listings, networking, quests, and more.

## Features

- Event listing and details
- Quests and badges
- Leaderboard and rewards
- Merchandise redemption
- Networking and messaging
- Firebase integration (authentication, cloud functions, etc.)

## Prerequisites

- **Node.js** (Recommended: v18 or later)
- **npm** (comes with Node.js)
- **Expo CLI**  
  Install globally if you don't have it:  
  ```bash
  npm install -g expo-cli
  ```
- **Firebase CLI** (for backend functions, optional)  
  Install globally if you want to use/deploy Cloud Functions:  
  ```bash
  npm install -g firebase-tools
  ```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/siejie17/student
cd student
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase (Optional, for backend functions)

If you want to use or develop Firebase Cloud Functions:

```bash
cd functions
npm install
cd ..
```

- Make sure you have a Firebase project and update any necessary config files (e.g., `google-services.json` for Android, found in the root).

### 4. Start the Expo app

```bash
npm start
```
or
```bash
expo start
```

- Use the Expo Go app on your phone to scan the QR code, or run on an emulator with:
  - `npm run android`
  - `npm run ios`
  - `npm run web`

### 5. (Optional) Emulate or Deploy Firebase Functions

- To emulate functions locally:
  ```bash
  cd functions
  npm run serve
  ```
- To deploy to Firebase:
  ```bash
  cd functions
  npm run deploy
  ```

## Project Structure

```
student/
  App.js
  components/
  screens/
  assets/
  functions/         # Firebase Cloud Functions
  utils/
  ...
```

## Troubleshooting

- If you have issues with dependencies, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.
- For Expo issues, try `expo doctor` or `expo start -c` to clear cache.
- Make sure your Firebase credentials (`google-services.json`) are correct for your project.

## License

[MIT](LICENSE) (or specify your license)
