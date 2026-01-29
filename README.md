# MyPhoto.my.id

A Google Photos clone with Wasabi S3 storage, Firebase backend, and Paddle payments.

## Features

- **Cloud Storage**: Secure photo and video storage with Wasabi S3
- **AI-Powered Search**: Find photos by content using TensorFlow.js and COCO-SSD
- **Face Detection**: Automatic face detection with face-api.js
- **Smart Thumbnails**: Auto-generated thumbnails using Sharp
- **Cross-Platform**: Web (Next.js) and Mobile (Expo/React Native)
- **Subscription Management**: Paddle integration for payments
- **Family Sharing**: Share storage with up to 5 family members

## Tech Stack

### Frontend
- **Web**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Mobile**: React Native + Expo
- **State**: Zustand, React Query

### Backend
- **API**: Next.js API Routes
- **Database**: Firebase Firestore
- **Auth**: Firebase Auth
- **Storage**: Wasabi S3
- **Payments**: Paddle

### AI (Free/Local)
- **Object Detection**: TensorFlow.js + COCO-SSD
- **Face Detection**: face-api.js
- **Image Processing**: Sharp

## Project Structure

```
myphoto/
├── apps/
│   ├── web/                    # Next.js 14 web app
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, Register
│   │   │   ├── (dashboard)/    # Main app
│   │   │   └── api/            # API routes
│   │   ├── components/
│   │   └── lib/
│   │
│   └── mobile/                 # Expo React Native app
│       ├── app/                # Expo Router
│       └── src/
│
├── packages/
│   ├── shared/                 # Shared types & utils
│   └── api-client/             # API client
│
├── firebase/
│   ├── firestore.rules
│   └── firestore.indexes.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- Firebase project
- Wasabi S3 bucket
- Paddle account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/myphoto.git
   cd myphoto
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the example env file:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   Fill in your credentials:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

   # Firebase Admin (for API routes)
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

   # Wasabi S3 Configuration
   WASABI_ACCESS_KEY_ID=your_wasabi_access_key
   WASABI_SECRET_ACCESS_KEY=your_wasabi_secret_key
   WASABI_BUCKET=myphoto-prod
   WASABI_REGION=eu-central-1

   # Paddle Configuration
   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=your_paddle_client_token
   PADDLE_API_KEY=your_paddle_api_key
   PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up Firebase**
   ```bash
   npx firebase init
   npx firebase deploy --only firestore:rules,firestore:indexes
   ```

5. **Run the development server**
   ```bash
   # Web app
   pnpm web

   # Mobile app
   pnpm mobile
   ```

### Setting up Wasabi S3

1. Create a Wasabi account at https://wasabi.com
2. Create a bucket named `myphoto-prod` in `eu-central-1`
3. Create an access key with read/write permissions
4. Configure CORS:
   ```json
   {
     "CORSRules": [{
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3000
     }]
   }
   ```

### Setting up Paddle

1. Create a Paddle account at https://paddle.com
2. Create products for each storage tier
3. Set up webhooks pointing to `/api/webhooks/paddle`
4. Copy your API keys to the environment variables

## Pricing Tiers

| Tier | Storage | Price/Month |
|------|---------|-------------|
| Free | 10 GB | $0 |
| Starter | 100 GB | $1.99 |
| Basic | 200 GB | $2.99 |
| Standard | 500 GB | $6.49 |
| Pro | 1 TB | $11.99 |
| Premium | 2 TB | $19.99 |
| Business | 5 TB | $45.99 |
| Enterprise | 10 TB | $84.99 |

Storage stacking is supported - users can combine multiple subscriptions.

## Development

### Commands

```bash
# Run all apps in development
pnpm dev

# Run web only
pnpm web

# Run mobile only
pnpm mobile

# Build all apps
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

### Mobile Development

For iOS:
```bash
cd apps/mobile
npx expo run:ios
```

For Android:
```bash
cd apps/mobile
npx expo run:android
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Files
- `GET /api/files` - List files
- `POST /api/files/upload-url` - Get pre-signed upload URL
- `POST /api/files/confirm-upload` - Confirm upload
- `DELETE /api/files/:id` - Move to trash

### Albums
- `GET /api/albums` - List albums
- `POST /api/albums` - Create album
- `POST /api/albums/:id/share` - Share album

### Search
- `POST /api/search` - AI-powered search

### Subscriptions
- `POST /api/webhooks/paddle` - Paddle webhook handler

## License

MIT
