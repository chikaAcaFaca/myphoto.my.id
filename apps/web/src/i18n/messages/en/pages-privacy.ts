/**
 * Privacy Policy (/privacy). Inline markup understood by the page's rich() helper:
 * **bold** and [[email@address]] (rendered as a mailto link).
 */
export const privacy = {
  meta: {
    title: 'Privacy Policy',
    description:
      'MyPhoto Privacy Policy — how we store and protect your photos. EU servers, GDPR compliance, and we never use your images for AI training.',
    ogTitle: 'Privacy Policy | MyPhoto',
    ogDescription: 'How we store and protect your photos. EU servers, GDPR, no AI training on your images.',
  },
  home: 'Home',
  title: 'Privacy Policy',
  lastUpdated: 'Last updated: {date}',
  laws: 'GDPR (EU 2016/679) | ZZPL (Serbia) | CCPA/COPPA (USA)',
  badges: {
    noAi: 'We do not use images for AI training',
    euServers: 'EU Servers (Frankfurt)',
    compliant: 'GDPR & ZZPL Compliant',
  },
  s1: {
    title: '1. Introduction',
    p1: 'MyPhoto (myphotomy.space) ("MyPhoto", "we", "us", "our") is committed to protecting your privacy. This Privacy Policy (the "Policy") describes how we collect, use, store and protect your data when you use our photo and video storage service.',
    p2: 'This Policy applies in accordance with the General Data Protection Regulation (GDPR — Regulation (EU) 2016/679), the Law on Personal Data Protection of the Republic of Serbia (ZZPL — "Official Gazette of RS", No. 87/2018), the California Consumer Privacy Act (CCPA) and the Children\'s Online Privacy Protection Act (COPPA).',
    philosophyTitle: 'Our core philosophy: your images are yours and yours alone.',
    philosophyText:
      'We do not use your photos to train AI models. We do not scan content for advertising. We do not sell your data. We do not share it with third parties except where necessary to provide the Service.',
  },
  s2: {
    title: '2. Definitions',
    personalData:
      '**"Personal data"** — any information relating to an identified or identifiable natural person (GDPR Article 4(1), ZZPL Article 4)',
    specialCategories:
      '**"Special categories of data"** — biometric data (face recognition), data from photos that may reveal racial/ethnic origin, health status, etc. (GDPR Article 9)',
    controller:
      '**"Controller"** — MyPhoto (myphotomy.space), which determines the purposes and means of processing personal data',
    processor:
      '**"Processor"** — third parties that process data on our behalf (cloud providers, payment processors)',
    processing:
      '**"Processing"** — any operation performed on personal data (collection, storage, erasure, transfer)',
    dpo: '**"DPO"** — Data Protection Officer',
  },
  s3: {
    title: '3. Data controller',
    intro: 'The controller of your personal data within the meaning of GDPR Article 4(7) and ZZPL Article 4 is:',
    email: 'Email:',
    dpo: 'DPO:',
    outro: 'For any questions regarding the processing of your personal data, you can contact our DPO at the address above.',
  },
  s4: {
    title: '4. What data we collect',
    intro: 'We collect only the data necessary for the Service to operate:',
    account: {
      title: 'a) Account data',
      email: 'Email address (required — for authentication and communication)',
      name: 'First and last name (optional)',
      photo: 'Profile picture (optional)',
      password: 'Password (hashed, bcrypt — we never store it in plain text)',
    },
    content: {
      title: 'b) User content',
      files: 'Photos and videos you upload',
      exif: 'EXIF metadata (date, location, camera — if present in the file)',
      albums: 'Albums, tags and organizational structures you create',
    },
    technical: {
      title: 'c) Technical data',
      ip: 'IP address (for security and abuse prevention)',
      browser: 'Browser type and operating system',
      usage: 'Information about storage usage and file access',
    },
    payment: {
      title: 'd) Payment data',
      processor: 'Processed through a our merchant of record (Creem) — **we do not store card data**',
      stored: 'We store only: transaction ID, amount, date and subscription status',
    },
  },
  s5: {
    title: '5. How we collect data',
    direct: '**Directly from you:** when you register, upload files, contact support, or configure your account',
    auto: '**Automatically:** we collect technical data (IP, browser, cookies) automatically when you use the Service',
    thirdParty:
      '**From third parties:** if you sign in via Google OAuth, we receive your email address and name from your Google account',
  },
  s6: {
    title: '6. Legal basis for processing (GDPR Article 6)',
    intro: 'We base every processing of personal data on one of the following legal bases:',
    contract:
      '**Performance of a contract** (Article 6(1)(b)) — processing necessary to provide the Service (storing files, generating thumbnails, sharing)',
    consent:
      '**Consent** (Article 6(1)(a)) — for AI features (smart search, auto-tagging), face recognition (Article 9(2)(a) for biometric data), analytics cookies',
    legitimate:
      '**Legitimate interest** (Article 6(1)(f)) — system security, abuse prevention, fraud prevention, improving the Service',
    legal: '**Legal obligation** (Article 6(1)(c)) — compliance with tax, accounting and regulatory requirements',
    withdraw:
      'You may withdraw your consent at any time via your account settings or by contacting the DPO. Withdrawal of consent does not affect the lawfulness of processing carried out before the withdrawal (GDPR Article 7(3)).',
  },
  s7: {
    title: '7. Purposes of data processing',
    intro: 'We use your data exclusively for the following purposes:',
    service: 'Providing the Service — storing, organizing and sharing your photos and videos',
    ai: 'AI features — smart search, auto-tagging, face recognition (only if you explicitly enable them)',
    thumbnails: 'Generating thumbnails and optimized versions for faster display',
    notifications: 'Notifications about your account, payments and security events',
    support: 'Technical support when you request it',
    security: 'Security — abuse detection, prevention of unauthorized access',
    legal: 'Compliance with legal obligations (tax, regulatory)',
  },
  s8: {
    title: '8. AI features and image processing',
    boxTitle: 'Your photos are never used to train AI models.',
    boxText:
      'AI features process your images solely for the Service functionality you have enabled (search, tagging, face recognition). Processing results are stored only in your account and are not accessible to anyone else.',
    smartSearch:
      '**Smart search and auto-tagging:** opt-in features — enabled only at your request (GDPR basis: consent)',
    face: '**Face recognition:** requires explicit consent to the processing of biometric data (GDPR Article 9(2)(a)). You can delete all face data at any time',
    noSale: '**No selling or sharing:** AI-generated tags and metadata are never shared with third parties',
  },
  s9: {
    title: '9. Sharing data with third parties',
    boxTitle: 'We do not sell your data. We do not share it for advertising purposes.',
    intro:
      'We share your data only with the following categories of recipients, subject to appropriate contractual safeguards (GDPR Article 28 — data processing agreement):',
    cloud: '**Cloud infrastructure:** for storing files on EU servers (Frankfurt, Germany)',
    payment: '**Merchant of record (Creem):** for processing payments — receives only the data necessary for the transaction',
    email: '**Email service:** for sending transactional emails (confirmations, notifications)',
    disclosure:
      'We may also disclose data where required by law or court order, or where necessary to protect our rights or the safety of our users or the public.',
  },
  s10: {
    title: '10. International data transfers',
    intro: 'All user files and primary data are stored on servers in the **European Union (Frankfurt, Germany)**.',
    neverOutside: 'Your files are **never transferred outside the EU** without your express consent',
    scc: 'Where a transfer outside the EU/EEA is necessary (e.g. payment processor), we use the **standard contractual clauses** (SCC) approved by the European Commission (GDPR Article 46(2)(c))',
    adequacy: 'For transfers to countries with an adequacy decision (GDPR Article 45), we rely on that decision',
    serbia:
      'In accordance with ZZPL Article 65, transfers of data from Serbia are subject to the same safeguards, including the Commissioner\'s decisions on the adequacy of protection.',
  },
  s11: {
    title: '11. Data security',
    intro:
      'We apply technical and organizational safeguards in accordance with GDPR Article 32 and ZZPL Article 50:',
    transit: '**Encryption in transit:** TLS 1.3 for all communications',
    rest: '**Encryption at rest:** AES-256 for all files on our servers',
    access: '**Access control:** principle of least privilege for all employees',
    passwords: '**Passwords:** bcrypt hashing, never stored in plain text',
    incident:
      '**Incident response:** we notify users and supervisory authorities of security incidents within 72 hours (GDPR Article 33)',
  },
  s12: {
    title: '12. Data retention',
    intro:
      'We retain data only for as long as necessary for the purpose for which it was collected (GDPR Article 5(1)(e), ZZPL Article 5):',
    account: '**Account data:** while the account exists + a 30-day grace period after deletion',
    files:
      '**User files:** while the account exists. Permanent deletion within 30 days of account deletion (backups within 90 days)',
    logs: '**Technical logs:** IP addresses and access logs are retained for 90 days for security purposes',
    payment: '**Payment data:** in accordance with tax legislation — up to 10 years for accounting purposes',
    ai: '**AI-generated data:** tags and face recognition data are deleted immediately upon deactivation of the feature or deletion of the account',
  },
  s13: {
    title: '13. Cookies and similar technologies',
    intro: 'MyPhoto uses **only strictly necessary (essential) cookies** for the Service to function:',
    session: '**Session cookies:** for authentication and keeping you signed in (strictly necessary)',
    csrf: '**CSRF tokens:** for protection against cross-site request forgery attacks (strictly necessary)',
    prefs: '**User preferences:** theme (light/dark), language (strictly necessary)',
    notUsed: 'What we do NOT use:',
    advertising: 'Advertising cookies',
    tracking: 'Third-party user tracking (ad tracking) cookies',
    social: 'Social media tracking pixels',
    analytics:
      'Analytics cookies are enabled only with your explicit consent (opt-in), in accordance with the ePrivacy Directive (2002/58/EC) and the GDPR.',
  },
  s14: {
    title: '14. GDPR user rights',
    intro: 'If you are located in the EU/EEA, you have the following rights under the GDPR:',
    access: '**Right of access** (Article 15) — request a copy of all personal data we hold about you',
    rectification: '**Right to rectification** (Article 16) — correct inaccurate or incomplete personal data',
    erasure: '**Right to erasure** (Article 17) — the "right to be forgotten"; request permanent deletion of all data',
    portability:
      '**Right to data portability** (Article 20) — download all data in a machine-readable format (JSON, ZIP with original files)',
    restriction: '**Right to restriction of processing** (Article 18) — temporarily restrict how we use your data',
    objection: '**Right to object** (Article 21) — object to processing based on legitimate interest',
    withdraw: '**Right to withdraw consent** (Article 7(3)) — withdraw previously given consent at any time',
    automated:
      '**Automated decision-making** (Article 22) — we do not make decisions based solely on automated processing that would have legal effects on you',
    complaint:
      'You have the right to lodge a complaint with the data protection supervisory authority in your country of residence, place of work or place of the alleged infringement (GDPR Article 77).',
  },
  s15: {
    title: '15. Serbian law — ZZPL',
    intro: 'For users from the Republic of Serbia, the following also applies:',
    zzpl: '**ZZPL** — Law on Personal Data Protection ("Official Gazette of RS", No. 87/2018), aligned with the GDPR. All GDPR rights listed in section 14 also apply under Serbian law',
    commissioner:
      '**Commissioner** — You have the right to lodge a complaint with the Commissioner for Information of Public Importance and Personal Data Protection (ZZPL Article 82)',
    court: '**Judicial protection** — The right to bring an action before the competent court to protect your rights under the ZZPL (Article 84)',
    damages:
      '**Compensation** — The right to compensation for material and non-material damage resulting from unlawful processing (ZZPL Article 86)',
    contact: 'Commissioner contact: **office@poverenik.rs** | Web: **poverenik.rs**',
    higher: 'In case of any difference between the GDPR and the ZZPL, the provision offering the higher level of user protection applies.',
  },
  s16: {
    title: '16. User rights in the USA (CCPA / COPPA)',
    ccpaTitle: 'California Consumer Privacy Act (CCPA):',
    ccpaIntro: 'If you are a California resident, you have the following additional rights:',
    know: '**Right to know:** what personal data we collect, use and share',
    delete: '**Right to delete:** request deletion of personal data',
    optOut: '**Right to opt out of sale:** MyPhoto **does not sell** your personal data — this right is automatically fulfilled',
    nonDiscrimination: '**Right to non-discrimination:** we will not discriminate against you for exercising your rights',
    coppaTitle: "Children's Online Privacy Protection Act (COPPA):",
    coppa:
      'MyPhoto does not knowingly collect personal data from children under the age of 13. Our Service requires a minimum age of **16 years**. If we learn that we have collected data from a child under 13, we will delete it immediately. If you are a parent and believe your child has opened an account, contact us at **dpo@myphotomy.space**.',
  },
  s17: {
    title: '17. Exercising your rights',
    intro: 'To exercise any of the rights in sections 14–16:',
    how: '**How:** send a request to [[dpo@myphotomy.space]] or use the option in your account settings',
    deadline:
      '**Response time:** within **30 days** (may be extended by an additional 60 days for complex requests, with notice)',
    verification:
      '**Identity verification:** we may ask you to confirm your identity before processing a request, to protect your data',
    free: '**Free of charge:** exercising your rights is free. For manifestly unfounded or excessive requests, we may charge a reasonable fee (GDPR Article 12(5))',
  },
  s18: {
    title: '18. Children and minors',
    intro: 'MyPhoto requires a minimum age of **16 years** to create an account, in accordance with:',
    gdpr: "**GDPR Article 8:** consent for information society services — minimum 16 years (or lower under a Member State's law, but not below 13)",
    coppa: '**COPPA:** prohibits the collection of data from children under 13 without verifiable parental consent',
    zzpl: '**ZZPL Article 16:** processing of data of minors in Serbia',
    outro:
      'We do not knowingly collect data from persons under 16. If we discover such an account, we will deactivate it and delete all associated data.',
  },
  s19: {
    title: '19. Deleting your account and data',
    intro: 'You can delete your account at any time from your account settings. Deletion procedure:',
    immediately: '**Immediately:** the account is deactivated and access to the Service ends',
    days30: '**30 days:** grace period — you can change your mind and reactivate the account',
    days90: '**30–90 days:** permanent deletion of all data, including backups',
    exceptions:
      '**Exceptions:** data we are legally required to keep (tax records) is retained for the period prescribed by law',
    before:
      '**Before deleting**, we recommend using the Export feature to download all your files in original quality (GDPR right to data portability).',
  },
  s20: {
    title: '20. Changes to this Privacy Policy',
    intro: 'We reserve the right to amend this Policy. We will notify you of changes:',
    material: '**Material changes:** notice by email at least **30 days** in advance',
    minor: '**Minor changes:** notice via an in-app notification',
    date: '**Date:** every version clearly states the date of its last update',
    outro:
      'Continued use of the Service after the changes take effect constitutes acceptance of the new Policy. For material changes that alter the legal basis for processing, we will ask for your consent again.',
  },
  s21: {
    title: '21. Contact and DPO',
    intro: 'For any questions regarding privacy and data protection:',
    dpo: '**Data protection (DPO):** [[dpo@myphotomy.space]]',
    privacy: '**General privacy questions:** [[privacy@myphotomy.space]]',
    legal: '**Legal department:** [[legal@myphotomy.space]]',
    form: '**Contact form:**',
    authorities: 'Supervisory authorities:',
    serbia:
      '**Serbia:** Commissioner for Information of Public Importance and Personal Data Protection — **office@poverenik.rs**',
    eu: '**EU:** the supervisory authority in your country of residence (list at edpb.europa.eu)',
  },
  cta: {
    title: 'Your privacy is our priority',
    text: 'Start free with 2.5GB — no credit card, no compromises.',
    button: 'Start for free',
  },
  footer: {
    rights: '© {year} MyPhoto. All rights reserved.',
    privacy: 'Privacy',
    terms: 'Terms',
    contact: 'Contact',
  },
} as const;
