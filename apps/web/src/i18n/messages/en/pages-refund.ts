// Refund policy. `**text**` marks bold spans (rendered by the page's rich() helper).
export const refund = {
  meta: {
    title: 'Refund Policy',
    description:
      'Refund and cancellation policy for MyPhoto paid storage plans: 14-day money-back guarantee, how to cancel and how to request a refund.',
  },
  title: 'Refund Policy',
  lastUpdated: 'Last updated: {date}',
  intro:
    'This policy applies to paid MyPhoto (myphotomy.space) storage subscriptions, operated and sold by NKNET CONSULTING DOO, Svetozara Miletića 104/18, 26101 Pančevo, Serbia (company reg. no. 22125338, tax ID 115190346). The free plan is never charged.',
  mor: {
    title: 'Who processes your payment',
    text: 'Our online orders are processed by our reseller and **Merchant of Record, Creem**, which also handles order-related inquiries and refunds. The charge on your card or bank statement will show Creem, and Creem issues your invoice.',
  },
  guarantee: {
    title: '14-day money-back guarantee',
    i1: 'You can request a **full refund within 14 days** of your first payment for any plan, without giving a reason.',
    i2: 'The same 14-day window applies to each **annual renewal**.',
    i3: 'Monthly renewals are generally not refundable once the new period has started, but we review every request individually — contact us if you were charged by mistake.',
    i4: 'This guarantee does not limit your statutory rights as a consumer under EU Directive 2011/83/EU or the Serbian Law on Consumer Protection.',
  },
  how: {
    title: 'How to request a refund',
    i1: 'Email **support@myphotomy.space** from the address on your account, with the order number or the date of the charge, or',
    i2: 'Reply to the Creem payment receipt you received by email.',
    outro: 'We respond within 2 business days. Approved refunds are returned to the original payment method, usually within **5–10 business days** depending on your bank.',
  },
  cancel: {
    title: 'Cancelling a subscription',
    i1: 'You can cancel at any time through the **Manage subscription** link in your Creem receipt email, or by emailing us.',
    i2: 'After cancelling, your plan stays active until the end of the period you already paid for, and you will not be charged again.',
    i3: 'Cancelling alone does not trigger a refund — request one as described above if you are within the refund window.',
  },
  after: {
    title: 'What happens to your files',
    text: 'After a refund or cancellation your account moves to the free plan. If your files exceed your free storage, your account becomes **read-only for 90 days**: you can view and download everything, upgrade, buy a one-time archive, or delete files, and we remind you by email. If you are still over the limit after 90 days, your most recently uploaded files over the limit are deleted. Files within your free storage are never affected.',
  },
  abuse: {
    title: 'Exceptions',
    text: 'We may decline refunds in cases of clear abuse, such as repeated purchase-and-refund cycles or accounts suspended for violating our Terms of Service. Please contact us before opening a chargeback with your bank — we can usually resolve the issue faster.',
  },
  contact: {
    title: 'Contact',
    text: 'Questions about billing or refunds:',
  },
} as const;
