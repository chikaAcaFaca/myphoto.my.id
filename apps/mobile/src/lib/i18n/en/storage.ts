// Storage guard — proactive upsell modal at 85% / 94% / 100%.
const storage = {
  viewPlans: 'View plans',
  upgradePlan: 'Upgrade plan',
  upgradeTo: 'Upgrade to {plan}',
  later: 'Later',
  notNow: 'Not now',
  warnTitle: 'Your storage is filling up',
  warnBody: "You've used about 85% of your storage — {remaining} left.",
  warnSuggest: 'Consider the {plan} plan ({storage}) so you never run out.',
  warnGeneric: 'Upgrade your plan so you never run out of space.',
  criticalTitle: 'Almost full!',
  criticalBody:
    "Only {remaining} left. Once it's full, new photos, videos and files can't be saved to the cloud.",
  criticalSuggest: 'Switch to {plan} ({storage}).',
  criticalSuggestPrice: 'Switch to {plan} ({storage}) for €{price}/year.',
  fullTitle: 'Your storage is full',
  fullBody:
    "Your cloud is full — new photos, videos and files can't be backed up right now. Upgrade your plan to keep your memories safe.",
  fullSuggest: 'Suggested: {plan} ({storage}).',
};

export default storage;
