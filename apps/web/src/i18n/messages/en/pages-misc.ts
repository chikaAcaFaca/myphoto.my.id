export const shell = {
  home: 'Home',
  rights: 'All rights reserved.',
  privacy: 'Privacy',
  terms: 'Terms',
  refund: 'Refunds',
  contact: 'Contact',
} as const;

export const contact = {
  meta: {
    title: 'Contact',
    description:
      'Contact the MyPhoto team — questions about private cloud storage, plans, GDPR and support. We reply quickly, in English and Serbian.',
    ogTitle: 'Contact | MyPhoto',
    ogDescription: 'Questions about private cloud storage, plans and support. Get in touch.',
  },
  title: 'Contact us',
  subtitle: "Have a question, a suggestion or need help? We'll be happy to answer.",
  formTitle: 'Send a message',
  nameLabel: 'Full name',
  namePlaceholder: 'Your name',
  emailLabel: 'Email address',
  emailPlaceholder: 'you@email.com',
  subjectLabel: 'Topic',
  subjectPlaceholder: 'Choose a topic',
  subjects: {
    general: 'General question',
    technical: 'Technical support',
    billing: 'Payments and subscription',
    bug: 'Report a problem',
    suggestion: 'Suggestion for improvement',
    partnership: 'Partnership',
  },
  messageLabel: 'Message',
  messagePlaceholder: 'Describe your question or suggestion...',
  send: 'Send message',
  mailSubject: 'Contact from MyPhoto (myphotomy.space)',
  mailName: 'Name',
  infoTitle: 'Contact information',
  emailTitle: 'Email',
  emailHint: 'For general questions and support',
  hoursTitle: 'Support hours',
  hours: 'Mon - Fri: 09:00 - 17:00 CET',
  hoursHint: 'We reply within 24h',
  locationTitle: 'Location',
  location: 'Pančevo, Serbia',
  locationHint: 'Servers in Frankfurt, Germany',
  faqTitle: 'Maybe the answer is already here?',
  faqText: 'Check the most common questions on the support page before sending a message.',
  faqLink: 'View FAQ',
  ctaTitle: 'Not a user yet?',
  ctaText: 'Start free with 1GB — up to 2.5GB by inviting friends. Sign up in 30 seconds.',
  ctaButton: 'Start free',
} as const;

export const support = {
  meta: {
    title: 'Help & support',
    description:
      'MyPhoto help and support — guides for photo backup, album sharing, payments and privacy. Find answers or contact our team.',
    ogTitle: 'Help & support | MyPhoto',
    ogDescription: "Guides for backup, album sharing, payments and privacy. We're here to help.",
  },
  title: 'How can we help you?',
  subtitle: 'Find answers to the most common questions or contact us directly.',
  ctaTitle: "Didn't find an answer?",
  ctaText: "Our support team is here to help. Get in touch and we'll reply within 24h.",
  ctaButton: 'Contact us',
  categories: {
    account: 'Account',
    billing: 'Payments',
    storage: 'Upload & storage',
    sharing: 'Sharing',
    ai: 'AI features',
    privacy: 'Privacy & security',
  },
  faq: {
    account: {
      create: {
        q: 'How do I create an account?',
        a: 'Click "Start free" on the home page. You can sign up with a Google account or an email address. Registration takes about 30 seconds and you get 1GB of storage — up to 2.5GB free by inviting friends (+250MB per friend, up to 6).',
      },
      password: {
        q: 'How do I change my password?',
        a: 'Go to Settings > Account > Change password. If you signed up with a Google account, the password is changed through Google.',
      },
      delete: {
        q: 'How do I delete my account?',
        a: 'You can request deletion in your account Settings. All your data will be permanently deleted within 30 days. Before deleting, we recommend exporting your files.',
      },
      devices: {
        q: 'Can I use the service on multiple devices?',
        a: 'Yes! Access MyPhoto from any device — phone, tablet or computer. Your photos are synced and available everywhere.',
      },
    },
    billing: {
      plans: {
        q: 'Which plans are available?',
        a: 'We offer a free plan (1GB, up to 2.5GB by inviting friends) and several paid plans. Current sizes and prices are on the pricing page.',
      },
      cancel: {
        q: 'Can I cancel my subscription?',
        a: 'Yes, you can cancel at any time from your account settings. Your plan stays active until the end of the paid period.',
      },
      periods: {
        q: 'Which billing periods are available?',
        a: 'We offer monthly, quarterly (2.5% off), semi-annual (5% off) and annual billing (2 months free). The longer the period, the bigger the discount.',
      },
      methods: {
        q: 'Which payment methods do you accept?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, American Express) through a secure payment processor.',
      },
    },
    storage: {
      formats: {
        q: 'Which file formats are supported?',
        a: 'We support all popular formats: JPEG, PNG, WebP, HEIC, GIF, MP4, MOV and many more. RAW formats are supported too.',
      },
      compression: {
        q: 'Is photo quality compressed?',
        a: 'No! We keep your photos in original quality, without compression. Every pixel is preserved exactly as you captured it.',
      },
      full: {
        q: 'What happens when my storage is full?',
        a: "You won't be able to upload new files. Your existing files stay safe. You can upgrade your plan or free up space by deleting files.",
      },
      export: {
        q: 'Can I export all my photos?',
        a: 'Yes! With one click you can download all your photos in original quality. Your data is always yours.',
      },
    },
    sharing: {
      share: {
        q: 'How do I share a photo?',
        a: "Open the photo in the gallery, click the share icon and copy the link. You can send it to anyone — they don't need an account.",
      },
      family: {
        q: 'What is Family Sharing?',
        a: "Family Sharing lets you add up to 5 family members who share common storage. Everyone's photos stay private — only the storage is shared.",
      },
      control: {
        q: 'Can I control who sees my photos?',
        a: 'Yes, you have full control. Sharing is off by default. When you share, you can deactivate the link at any time.',
      },
    },
    ai: {
      smartSearch: {
        q: 'What is Smart Search?',
        a: 'Smart Search lets you search photos by description — for example "beach photos" or "sunset". AI analyzes the content of your photos and finds exactly what you are looking for.',
      },
      training: {
        q: 'Do you use my photos for AI training?',
        a: 'No, never. Your photos are used only for the AI features you turn on (search, tagging, face recognition). We do not share them with third parties or use them to train models.',
      },
      faces: {
        q: 'How does Face Recognition work?',
        a: 'AI automatically detects and groups faces in your photos. You can name them and easily find all photos of a specific person. This feature works only on your photos and the data never leaves EU servers.',
      },
    },
    privacy: {
      location: {
        q: 'Where is my data stored?',
        a: 'Your data is stored on servers in the European Union (Frankfurt, Germany), in compliance with the GDPR.',
      },
      gdpr: {
        q: 'Are you GDPR compliant?',
        a: 'Yes. We fully comply with the GDPR. You have the right to access, rectify, erase and port your data.',
      },
      access: {
        q: 'Who has access to my photos?',
        a: 'Only you and the users you explicitly share photos with. Our team has no access to your content except for technical support at your request.',
      },
    },
  },
} as const;

export const deleteAccount = {
  meta: {
    title: 'Delete account',
    description: 'How to permanently delete your MyPhoto account and all associated data.',
  },
  title: 'Delete your MyPhoto account',
  appliesBefore: 'This page applies to the ',
  appliesMiddle: ' app (Android, web and desktop) published by',
  howTitle: 'How to delete your account',
  howApp: 'In the Android app:',
  howAppPath: 'Settings → Delete account',
  howWeb: 'On the web:',
  howWebPath: 'Settings → Privacy → Delete account and all data',
  howWebAfter: ', or use the button below.',
  howEmail: 'If you can no longer sign in, email',
  howEmailAfter: 'from the address registered on your account. We complete these requests within 30 days.',
  deletedTitle: 'What is deleted',
  deletedText:
    'Immediately and permanently: all photos, videos and files (originals and thumbnails), albums, MySpace folders, memes and comments, share links, device registrations, AI tags and face groups, your profile and your login.',
  keptTitle: 'What is kept',
  keptText:
    'Payment and invoice records are held by our payment provider (merchant of record) for the period required by tax law. We keep an anonymous log entry (no name, email or content) that a deletion took place. Encrypted backups roll over and are fully purged within 30 days.',
  signInToDelete: 'Sign in to delete your account',
  deleteButton: 'Delete account',
} as const;

export const desktopAuth = {
  subtitle: 'Sign in with your Google account to connect the desktop app.',
  continue: 'Continue with Google',
  wait: 'Please wait…',
  badLink: 'Invalid link (missing port or state). Please try again from the app.',
  signingIn: 'Signing in with Google…',
  connecting: 'Connecting to the MyPhoto app…',
  done: 'Signed in! You can close this tab and return to the MyPhoto app.',
  failed: 'Google sign-in failed.',
} as const;

export const meme = {
  notFoundTitle: 'Meme not found',
  notFound: 'Meme not found',
  goHome: 'Go to MyPhoto',
  metaDescription: '{caption} — Made with MyPhoto. Make your own meme for free!',
  ogDescription: 'Make your own meme for free with MyPhoto!',
  twitterDescription: 'Make your own meme for free!',
  ctaTitle: 'Make your own meme!',
  ctaText: 'Free sign-up. Make a meme, share it on the MemeWall, collect likes!',
  ctaButton: 'Sign up free',
  feed: {
    getApp: 'Get the app',
    signIn: 'Sign in',
    like: 'Like',
    comments: 'Comments',
    share: 'Share',
    tapForSound: 'Tap for sound',
    gateTitle: 'Want more memes?',
    gateText: 'Sign up free to keep scrolling, like, comment and make your own memes. You also get 1 GB to back up your photos.',
    gateRegister: 'Sign up free',
    gateLogin: 'I already have an account',
  },
  appTitle: 'Get the MyPhoto app',
  appText: 'Memes, automatic photo backup and messages with friends — on your phone.',
  downloadAndroid: 'Download for Android',
  downloadHint: 'Free. After downloading, open the file and allow installing from this source.',
  iosHint: 'On iPhone: tap Share in Safari, then Add to Home Screen, to use MyPhoto like an app.',
  featuresTitle: 'MyPhoto — more than memes',
  featBackup: 'Automatic photo backup from your phone',
  featStorage: 'Cloud storage for files (MySpace)',
  featAi: 'AI search and tagging',
  featMeme: 'Meme generator + MemeWall',
  featFamily: 'Family plan — share with your family',
  featPrivacy: 'EU servers, GDPR, no AI training',
  justNow: 'just now',
  minutesAgo: '{n} min ago',
  hoursAgo: '{n} h ago',
  daysAgo: '{n} d ago',
  shareText: '{caption} — Made with MyPhoto',
  linkCopied: 'Link copied!',
  commentFailed: 'Failed to post comment.',
  commentError: 'Error posting comment.',
  commentsTitle: 'Comments ({count})',
  commentLabel: 'Write a comment',
  commentPlaceholder: 'Write a comment...',
  commentSubmit: 'Post comment',
  commentSending: 'Posting...',
  signIn: 'Sign in',
  signInToComment: 'to leave a comment.',
  commentsLoading: 'Loading comments...',
  noComments: 'No comments yet. Be the first!',
} as const;

export const user = {
  loading: 'Loading profile...',
  notFound: 'User not found',
  goMemeWall: 'Go to MemeWall',
  memes: 'memes',
  followers: 'followers',
  following: 'following',
  follow: 'Follow',
  unfollow: 'Unfollow',
  publicMemes: 'Public memes',
  memesLoading: 'Loading memes...',
  noMemes: "This user hasn't posted any memes yet.",
} as const;
