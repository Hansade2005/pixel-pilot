# Template Earnings View - User Guide

## Accessing the Template Earnings Dashboard

### URL
```
/workspace?view=template-earnings
```

### Direct Link
Add this link to your navigation or bookmark:
```
https://your-app.com/workspace?view=template-earnings
```

---

## Features Overview

### 1. **Earnings Summary Cards**
Four cards at the top showing:
- **Total Earned**: All-time earnings from template sales
- **Pending Payout**: Ready to withdraw to bank account
- **Already Paid Out**: Completed payouts to your bank
- **Current Balance**: Available balance in wallet

### 2. **Action Buttons**
- **Request Payout**: Withdraw pending earnings
  - Minimum: $50.00
  - Processing: 2-5 business days
  - Requires bank details to be saved
- **Bank Details**: Add or update your bank account info
- **Refresh**: Reload latest earnings data

### 3. **Top Selling Templates Table**
Shows your best performing templates with:
- Template name
- Total revenue earned
- Number of sales
- Average rating (1-5 stars)
- Review count
- Featured badge (if featured)

### 4. **Payout History Table**
Track all payout requests:
- Date requested
- Amount
- Current status (Pending/Processing/Completed/Failed)
- Date received (when completed)

---

## Step-by-Step: Request a Payout

### Prerequisites
✓ You must have at least $50.00 pending  
✓ Bank details must be saved first

### Steps

1. **Click "Request Payout" Button**
   - Opens payout request dialog

2. **View Available Balance**
   - Shows your pending payout balance
   - Example: `$234.50 Available`

3. **Enter Withdrawal Amount**
   - Enter amount between $50 - $available_balance
   - Example: `234.50`

4. **Review Details**
   - Confirms transfer to your registered bank
   - Shows processing time: 2-5 business days
   - Note about bank details requirement

5. **Click "Request Payout"**
   - System validates amount
   - Creates payout request
   - Updates wallet balance
   - Shows confirmation message

6. **Track Status**
   - See in Payout History table
   - Status changes: Pending → Processing → Completed
   - Date received shows when funds arrive

---

## Step-by-Step: Add Bank Details

### Prerequisites
✓ You must have a valid bank account
✓ Account must be in your name
✓ US bank accounts (support for international coming soon)

### Steps

1. **Click "Bank Details" Button**
   - Opens bank details form

2. **Fill Account Holder Name**
   - Must match your bank account name
   - Example: `John Doe`

3. **Enter Bank Name**
   - Full name of your bank
   - Example: `Chase Bank` or `Bank of America`

4. **Enter Account Number**
   - Your checking/savings account number
   - Numbers only (special characters removed automatically)
   - Example: `0123456789`
   - **Stay secure**: Don't share with anyone

5. **Enter Routing Number**
   - Your bank's routing number
   - 9 digits (numbers only)
   - Example: `021000021`
   - **Stay secure**: Don't share with anyone

6. **Toggle Visibility**
   - Eye icon hides/shows sensitive numbers
   - Use to securely enter info

7. **Click "Save Bank Details"**
   - Validates all fields filled
   - Encrypts and stores securely
   - Shows confirmation: "Bank details saved successfully"

8. **View Summary**
   - Shows masked account (last 4 digits only)
   - Shows bank name
   - Shows account holder name

---

## Understanding Your Earnings

### How Earnings Work
```
Template Sold for $10.99
  ↓
Platform takes 30% commission: $3.30
  ↓
You earn: $7.69
  ↓
Goes to your "Pending Payout" balance
  ↓
When you request payout → Goes to "Already Paid Out"
  ↓
Arrives in your bank in 2-5 business days
```

### Earnings Breakdown Example

**Scenario: You sold 3 templates**
- Template 1: 5 sales × $10.99 = $54.95
- Template 2: 12 sales × $7.99 = $95.88
- Template 3: 8 sales × $12.99 = $103.92

**Your Numbers:**
```
Total Sales: 25 transactions
Total Revenue: $254.75 (before commission)
Your Earnings (70%): $178.33
Platform Revenue (30%): $76.42

Pending Payout: $178.33 (ready to withdraw)
Already Paid Out: $0 (no requests yet)
Total Earned: $178.33 (all-time)
```

---

## Key Information

### Payout Minimums
- **Minimum per request**: $50.00
- **No maximum**: Request any amount up to your pending balance

### Processing Times
- **Stripe Processing**: 1-2 business days to process
- **Bank Deposit**: 1-3 additional business days
- **Total**: 2-5 business days typical

### Security
✓ Bank details encrypted and stored securely  
✓ Stripe handles all transfers (PCI compliant)  
✓ Your SSN/tax info collected at payout time  
✓ 1099-NEC forms sent annually if earnings > $600  

### Supported Countries
- 🇺🇸 United States (all states)
- 🇨🇦 Canada (coming soon)
- 🇬🇧 UK (coming soon)
- 🌍 International (coming soon)

---

## Troubleshooting

### Issue: "Insufficient Balance"
**Solution**: You need $50+ pending balance
- Keep selling templates to earn more
- Check "Top Selling Templates" to see which ones perform best

### Issue: "Bank Details Not Found"
**Solution**: You must save bank details before requesting payout
- Click "Bank Details" button
- Fill in all required information
- Click "Save Bank Details"

### Issue: Payout Still "Processing" After 5 Days
**Solution**: Contact support
- Stripe typically completes in 2-5 days
- Rare delays due to bank verification
- We'll investigate if you wait 5+ days

### Issue: Account Number Input Keeps Clearing
**Solution**: This is normal
- System only accepts numbers
- Special characters/spaces removed automatically
- Just numbers needed: `0123456789`

### Issue: "Bank Details Form Won't Save"
**Solution**: Check all fields filled
- Account Holder Name (required)
- Bank Name (required)
- Account Number (required, numbers only)
- Routing Number (required, 9 digits)
- All fields must be filled

---

## Tips & Best Practices

### Maximize Earnings
1. **Create Multiple Templates**: Each template is a revenue stream
2. **Update Top Sellers**: Focus on templates with most reviews/ratings
3. **Respond to Reviews**: Address feedback to improve ratings
4. **Feature Templates**: Premium placement increases visibility
5. **Bundle Templates**: Group related templates for discounts

### Payout Strategy
1. **Request Often**: Payout every 50-100 sales
   - Reduces risk if account has issues
   - Regular income stream
2. **Bundle Payouts**: Reduce transaction fees
   - Wait for $500+ to minimize overhead
3. **Track Deposits**: Verify each payout arrives
   - Check bank in 5-7 days
   - Contact support if missing

### Account Management
1. **Update Bank Details**: If account changes
   - Bank account closed? Update new account
   - Name change? Update account holder
2. **Monitor Ratings**: Stay above 4.0 average
   - Respond professionally to negative reviews
   - Templates below 3.5 stars may be demoted
3. **Check Balance Weekly**: Monitor growth
   - Refresh button updates live data
   - Plan payout requests ahead

---

## FAQ

**Q: How often can I request payouts?**  
A: Anytime you have $50+. No limit on frequency.

**Q: Can I change my bank account?**  
A: Yes, use "Bank Details" button anytime to update.

**Q: Do I get a 1099 form?**  
A: Yes, if annual earnings > $600. Sent in January via email.

**Q: What if my bank declines the transfer?**  
A: Payout marked as "Failed". Contact support with bank details.

**Q: Can I payout to different banks?**  
A: Not yet, but roadmap includes multi-account support.

**Q: Is there a transaction fee?**  
A: No. Stripe covers processing fees.

**Q: When is my payout processed?**  
A: Usually next business day. Then 1-3 days to your bank.

**Q: Can I cancel a pending payout?**  
A: No, once submitted it's processed. Contact support for issues.

**Q: What's the commission split?**  
A: Standard is 70/30 (you/platform). Higher tiers get better rates.

---

## Support

### Contact Us
- 📧 **Email**: support@pixelpilot.com
- 💬 **Chat**: In-app support chat
- 📱 **Phone**: +1-800-PIXEL-01

### Resources
- [Marketplace Help Center](https://help.pixelpilot.com/marketplace)
- [Creator Guidelines](https://pixelpilot.com/creator-guidelines)
- [Template Best Practices](https://pixelpilot.com/template-guide)
- [Stripe Help](https://support.stripe.com)

---

## Legal Notes

- You are responsible for your taxes. We provide 1099 forms for reference.
- By requesting payouts, you certify your bank account is in your legal name.
- Fraudulent account details will result in permanent suspension.
- All payouts are final (no refunds once cleared to your bank).

---

**Last Updated**: December 11, 2025  
**Status**: ✅ Live & Ready to Use
