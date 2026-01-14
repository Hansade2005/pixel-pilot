# Plan Name Migration - Complete Audit ✅

## Overview
Updated all pages, APIs, and components to handle both legacy and new plan naming schemes for backward compatibility and forward migration.

## Plan Name Mapping

| Legacy Name (user_settings) | New Name (wallet & stripe-config) | Price | Credits |
|------------------------------|-----------------------------------|-------|---------|
| `pro`                        | `creator`                         | $15   | 50      |
| `teams`                      | `collaborate`                     | $25   | 75      |
| `enterprise`                 | `scale`                           | $60   | 150     |
| `free`                       | `free`                            | $0    | 0       |

## Database Architecture

### Two-Table System
1. **user_settings**: Uses legacy names (`pro`, `teams`, `enterprise`) for backward compatibility
2. **wallet**: Uses new canonical names (`creator`, `collaborate`, `scale`) matching stripe-config

### Why Both?
- **Backward Compatibility**: Existing data and queries continue to work
- **Forward Migration**: New features use canonical names from stripe-config
- **Dual Sync**: All mutation operations update both tables with correct mapping

## Files Updated

### ✅ API Routes
- **app/api/stripe/webhook/route.ts** - Handles both naming schemes, maps correctly
- **app/api/stripe/verify-session/route.ts** - Maps plans on checkout completion
- **app/api/stripe/fix-subscription/route.ts** - Retroactive fix with mapping
- **app/api/admin/users/route.ts** - All actions sync both tables with proper mapping
- **app/api/admin/stats/route.ts** - Revenue calculation handles both names

### ✅ Admin Pages
- **app/admin/billing/page.tsx** - Updated pricing display, revenue calc, insights
- **app/admin/users/page.tsx** - Fixed stats card, downgrade button logic, deployment limits

### ✅ Components
- **components/navigation.tsx** - Badge display and dropdown use new names with fallback
- **components/workspace/pc-sidebar.tsx** - Plan display, features, deployment limits
- **components/ui/model-selector.tsx** - Model access control handles both names

### ✅ Hooks
- **hooks/use-subscription-cache.ts** - Added `isTeams`, `isEnterprise` checks alongside `isPro`

## Code Patterns

### ✅ Correct: Dual-Name Check
```typescript
// Components reading from user_settings (which has legacy names)
if (subscription.plan === 'pro' || subscription.plan === 'creator') {
  // Creator plan logic
}

// Components reading from wallet (which has new names)
if (wallet.current_plan === 'creator') {
  // Creator plan logic
}
```

### ✅ Correct: Admin API Mapping
```typescript
// upgrade_to_pro action
await supabase.from('user_settings')
  .update({ subscription_plan: 'pro' })  // Legacy name for user_settings
  
await supabase.from('wallet')
  .update({ current_plan: 'creator' })   // New name for wallet
```

### ✅ Correct: Display Names
```typescript
// UI displays new names to users
{(plan === 'pro' || plan === 'creator') ? 'Creator Plan' :
 (plan === 'teams' || plan === 'collaborate') ? 'Collaborate Plan' :
 (plan === 'enterprise' || plan === 'scale') ? 'Scale Plan' : 'Free Plan'}
```

## Verification Results

### Search Results
- ✅ All `plan === 'pro'` checks now include `|| plan === 'creator'`
- ✅ All `plan === 'teams'` checks now include `|| plan === 'collaborate'`
- ✅ All `plan === 'enterprise'` checks now include `|| plan === 'scale'`
- ✅ Revenue calculations handle both naming schemes
- ✅ Admin stats API correctly counts subscriptions across both names
- ✅ UI displays use new canonical names (Creator, Collaborate, Scale)

### Remaining Intentional Legacy Usage
- **Database constraints** (supabase/setup.sql) - Uses legacy names for user_settings table
- **Admin API actions** - Correctly maps between legacy and new names
- **Comments** - Some code comments reference legacy names for clarity

## Testing Checklist

### Frontend
- [ ] Navigation bar shows correct plan names (Creator/Collaborate/Scale)
- [ ] Account page displays accurate plan information
- [ ] Model selector shows correct access for paid plans
- [ ] PC Sidebar displays proper plan features and limits

### Admin Panel
- [ ] `/admin/users` - Stats card shows correct Creator Plan user count
- [ ] `/admin/users` - Downgrade button works for all plan types
- [ ] `/admin/billing` - Revenue calculation is accurate
- [ ] `/admin/billing` - Subscription list shows correct pricing
- [ ] `/admin/analytics` - Dashboard revenue matches subscriptions × prices

### APIs
- [ ] Webhook correctly updates both tables on subscription changes
- [ ] New subscriptions get correct plan names in both tables
- [ ] Admin actions (upgrade/downgrade/update_plan) sync both tables
- [ ] Credit replenishment uses correct amounts (50/75/150)

## Migration Path

### Phase 1: Dual Support (Current) ✅
- All code checks both legacy and new names
- Both tables maintained with proper mapping
- No breaking changes for existing users

### Phase 2: Data Migration (Future)
- Run migration to update user_settings to use new names
- Update database constraints to accept new names
- Remove legacy name checks from code

### Phase 3: Cleanup (Future)
- Remove dual-name checks, use only canonical names
- Simplify codebase with single naming scheme
- Update documentation

## Key Takeaways

1. **Always Check Both Names** - Until migration is complete, all plan checks must handle both naming schemes
2. **Table-Specific Logic** - Know which table uses which names (user_settings = legacy, wallet = new)
3. **Display New Names** - UI should show new canonical names (Creator/Collaborate/Scale) to users
4. **API Mapping** - Admin APIs must correctly map between tables
5. **Backward Compatible** - System works seamlessly with both old and new data

## Resources

- **Stripe Config**: `lib/stripe-config.ts` - Source of truth for new plan names
- **Credit Manager**: `lib/billing/credit-manager.ts` - Credit amounts per plan
- **Subscription Hook**: `hooks/use-subscription-cache.ts` - Reads from user_settings
- **Webhook Handler**: `app/api/stripe/webhook/route.ts` - Syncs both tables

---

**Status**: ✅ All pages, APIs, and components updated to handle both legacy and new plan names

**Last Updated**: January 2025
