# 🚀 Quick Start Guide - SunPower Mobile App

## ⚡ Get Running in 5 Minutes!

### Step 1: Install Dependencies
```bash
cd sunpower-mobile
npm install
```

### Step 2: Start Development Server
```bash
npm start
```

This will open the Expo Dev Tools in your browser.

### Step 3: Run on Device

#### Option A: Physical Device (Easiest!)
1. Install **Expo Go** app from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in terminal/browser
3. App will load on your phone!

#### Option B: iOS Simulator (Mac only)
```bash
npm run ios
```

#### Option C: Android Emulator
```bash
npm run android
```

---

## 🧪 Testing the App

### Test Login Flow:

1. **Enter Phone Number**
   - Type any 10-digit number (e.g., `9876543210`)
   - Click **"Send OTP"**

2. **Check OTP**
   - Alert will pop up showing: "Your verification code: 123456"
   - In production, this will be sent via SMS

3. **Enter OTP**
   - Type the 6-digit code shown in alert
   - Auto-submits when complete!

4. **Enable Biometric** (Optional)
   - Dialog appears: "Enable Biometric Login?"
   - Click **"Enable"** to use Face ID/Touch ID next time
   - Click **"Not Now"** to skip

5. **Welcome to Dashboard!** 🎉

---

## 🎨 What You'll See

### Login Screen
- 3D robot mascot 🤖
- Beautiful Aurora gradient background
- Phone input with country code (+91)
- Smooth animations
- Trust badges

### Dashboard
- Personalized greeting "Good Morning, Viraj! 🌅"
- Energy generation card (18.5 kWh)
- 4 stat cards with cool gradients
- Quick action buttons
- Recent activity feed
- Installation progress tracker

### Bottom Navigation
- 🏠 Home
- 📍 Track
- 🤖 AI
- 🔧 Service
- 👤 Profile

---

## 🔐 Testing Biometric

### iOS Simulator:
1. Run app
2. Login once
3. Close app (⌘ + Q)
4. Restart app
5. Face ID prompt appears automatically!

To enable Face ID in simulator:
- Features → Face ID → Enrolled
- When prompted, select "Matching Face"

### Android Emulator:
1. Settings → Security → Screen Lock → PIN
2. Set up fingerprint
3. Run app and enable biometric
4. Test fingerprint on login

---

## 📱 Features to Try

### ✅ Current Features
- SMS OTP login
- Biometric authentication
- Dashboard with stats
- Navigation between screens
- Profile settings
- Logout

### 🔜 Coming Soon
- Camera for service requests
- Push notifications
- Document viewer
- Installation photos
- Real-time updates

---

## 🐛 Troubleshooting

### "Cannot find module" error
```bash
npm install
```

### iOS build fails
```bash
cd ios && pod install && cd ..
npm run ios
```

### Android build fails
1. Check Android Studio installed
2. Check emulator running
3. Try: `npm run android`

### App won't start
1. Close terminal
2. Kill all Node processes
3. Run `npm start` again

### Changes not reflecting
1. Press `r` in terminal (reload)
2. Or shake device → "Reload"

---

## 📝 Development Tips

### Hot Reload
- Saves automatically reload the app
- Fast refresh keeps your app state
- Press `r` to force reload

### Debug Menu
- Shake device (or ⌘ + D on iOS, ⌘ + M on Android)
- Access:
  - Reload
  - Debug JS Remotely
  - Show Inspector
  - Performance Monitor

### VS Code Setup
Recommended extensions:
- React Native Tools
- ES7+ React/Redux/React-Native snippets
- Prettier
- ESLint

---

## 🎯 Quick Links

### Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Router](https://expo.github.io/router/)

### Project Files
- `app/` - All screens
- `components/ui/` - Reusable components
- `services/` - Authentication logic
- `theme/` - Colors, spacing, shadows

---

## 🚀 Next Steps

1. **Customize Colors**
   - Edit `theme/colors.ts`
   - Change primary violet to your brand color

2. **Add Your Logo**
   - Replace `assets/icon.png`
   - Update `app.json`

3. **Connect Backend**
   - Edit `services/smsAuth.ts`
   - Add your API endpoints

4. **Add More Screens**
   - Create new files in `app/(portal)/`
   - Auto-added to navigation!

---

## 💡 Pro Tips

### Fast Development
- Use physical device for best experience
- Enable Fast Refresh (default)
- Keep dev tools open

### Testing SMS
- Use real phone number
- Integrate Twilio for actual SMS
- Or use Firebase Auth

### Performance
- Use memoization for heavy components
- Lazy load images
- Enable Hermes engine (default)

---

## 🎉 You're Ready!

The app is fully functional and ready to customize!

**Questions?** Check `README.md` for detailed documentation.

**Issues?** Make sure all dependencies are installed.

**Success?** Start building amazing features! 🚀

---

**Happy Coding! 💚**

*Built with Aurora Eco 3D Theme*
