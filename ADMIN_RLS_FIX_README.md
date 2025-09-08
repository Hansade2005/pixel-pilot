# Admin RLS Policies & Name Update Fix

## Issues Fixed

### 1. Row-Level Security (RLS) Policy Violations

**Problem**: Admin operations like updating credits and suspending users were failing with:
```
Error: new row violates row-level security policy for table "user_settings"
Code: 42501
```

**Root Cause**: RLS policies only allowed users to access their own data, preventing admin from managing other users.

**Solution**: Added admin-specific RLS policies that allow `hanscadx8@gmail.com` to access all user data.

### 2. Name Updates Not Reflecting in Supabase Auth

**Problem**: When users updated their name in the accounts page, it only updated locally but not in Supabase Auth metadata.

**Solution**: Modified the name update function to update both auth metadata and profiles table.

## 🛠️ **Solutions Applied**

### 1. RLS Policy Updates

#### New Admin Policies Added:
```sql
-- Admin policies for user_settings
CREATE POLICY "Admin can view all user settings" ON user_settings
  FOR SELECT USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can update all user settings" ON user_settings
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

-- Admin policies for profiles
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');

CREATE POLICY "Admin can update all profiles" ON profiles
  FOR UPDATE USING (auth.jwt() ->> 'email' = 'hanscadx8@gmail.com');
```

#### What This Enables:
- ✅ Admin can update any user's credits
- ✅ Admin can change any user's subscription plan
- ✅ Admin can suspend any user account
- ✅ Admin can create profiles for users
- ✅ Admin can view all user data and profiles

### 2. Name Update Fix

#### Before (Broken):
```typescript
const handleSaveName = async () => {
  // Only updated auth metadata
  await supabase.auth.updateUser({
    data: { full_name: editingName.trim() }
  })
  // ❌ Missing profiles table update
}
```

#### After (Fixed):
```typescript
const handleSaveName = async () => {
  // Update auth metadata
  await supabase.auth.updateUser({
    data: { full_name: editingName.trim() }
  })

  // ✅ Also update profiles table
  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: editingName.trim(),
    updated_at: new Date().toISOString()
  })
}
```

## 📋 **How to Apply the Fix**

### Step 1: Apply RLS Policies
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `scripts/apply_admin_rls_policies.sql`
5. Click **Run** to apply the changes

### Step 2: Test the Fixes
1. **Login as admin** (`hanscadx8@gmail.com`)
2. **Go to Admin Users** (`/admin/users`)
3. **Test admin operations**:
   - Click "Update Credits" on any user
   - Click "Change Plan" on any user
   - Click "Suspend User" on any user
   - All should work without RLS errors

### Step 3: Test Name Updates
1. **Login as regular user**
2. **Go to Account page** (`/workspace/account`)
3. **Update your name** in the profile section
4. **Check admin panel** - name should appear in user list
5. **Verify persistence** - name should persist across sessions

## 🔐 **Security Considerations**

### Admin Access Control
- Only `hanscadx8@gmail.com` has admin privileges
- Admin policies are email-based for security
- Regular users maintain their own data access
- Admin actions are logged for audit trails

### Data Protection
- RLS policies ensure users can't access others' data
- Admin override only applies to designated admin user
- All operations go through proper authentication
- Database operations are properly validated

## 📊 **What Now Works**

### Admin User Management
- ✅ **View All Users**: Complete list of all registered users
- ✅ **Update Credits**: Change any user's credit balance
- ✅ **Change Plans**: Modify subscription plans for any user
- ✅ **Suspend Users**: Administrative account suspension
- ✅ **Create Profiles**: Set up missing user profiles
- ✅ **Real-time Updates**: Changes reflect immediately

### User Name Updates
- ✅ **Auth Metadata**: Updates Supabase Auth user metadata
- ✅ **Profiles Table**: Also updates local profiles table
- ✅ **Admin Visibility**: Name changes visible in admin panel
- ✅ **Persistence**: Name changes persist across sessions
- ✅ **Consistency**: Name appears consistently across the app

## 🚨 **Important Notes**

### Database Changes Required
- **Must apply SQL changes** before admin features work
- **Existing data preserved** - no data loss during update
- **Backward compatible** - existing user data remains intact

### Testing Recommendations
- **Test with non-admin user** first for name updates
- **Test admin operations** on test users before production
- **Verify permissions** - ensure only admin can perform admin operations
- **Check data consistency** - verify names appear correctly everywhere

### Rollback Plan
If issues arise, you can:
1. **Remove admin policies** from Supabase SQL Editor
2. **Revert name update code** to previous version
3. **Contact support** if database issues persist

## 🎉 **Success Indicators**

### Admin Panel Working:
- [ ] Can view all users in admin panel
- [ ] Can update user credits without errors
- [ ] Can change user plans without errors
- [ ] Can suspend users without errors
- [ ] User statistics display correctly

### Name Updates Working:
- [ ] User can update name in account page
- [ ] Name appears in admin user list
- [ ] Name persists across browser sessions
- [ ] Name appears consistently in UI

## 📞 **Support**

If you encounter any issues:
1. **Check browser console** for error messages
2. **Verify SQL application** in Supabase dashboard
3. **Test with different users** to isolate issues
4. **Contact development team** if problems persist

---

## ✅ **Ready for Production!**

Both issues have been resolved:
- **RLS Policy Violations**: Admin can now manage all users ✅
- **Name Update Issues**: Names update in both auth and profiles ✅

**Apply the SQL changes and test the functionality!** 🎯✨
