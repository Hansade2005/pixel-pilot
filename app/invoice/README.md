# Professional Invoice Generator

A comprehensive invoice creation and PDF generation tool built for Pixel Pilot.

## Features

✅ **Professional Design** - Clean, modern invoice layout
✅ **Comprehensive Form** - All essential invoice fields included
✅ **Dynamic Items** - Add/remove invoice line items easily
✅ **Real-time Preview** - See your invoice as you build it
✅ **PDF Generation** - Download professional PDF invoices
✅ **Responsive Design** - Works on all devices
✅ **Auto Calculations** - Automatic subtotal, tax, and total calculations

## How to Use

1. **Fill Company Information**
   - Company name, address, phone, email
   - Pre-filled with Pixel Pilot branding

2. **Add Client Details**
   - Client name and billing address
   - Contact information

3. **Invoice Details**
   - Auto-generated invoice number
   - Invoice date and due date
   - Optional PO number

4. **Add Invoice Items**
   - Description, quantity, and rate
   - Automatic amount calculation
   - Add/remove items dynamically

5. **Financial Details**
   - Tax rate (percentage)
   - Discount amount
   - Custom notes

6. **Download PDF**
   - Preview your invoice in real-time
   - Click "Download PDF" to save
   - Professional PDF ready for clients

## Technical Details

- **Frontend**: Next.js 14 with React 18
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF + html2canvas (CDN)
- **State Management**: React useState
- **Responsive**: Mobile-first design

## CDN Libraries

The app uses the following CDN libraries for PDF generation:
- jsPDF: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`
- html2canvas: `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`

## File Structure

```
app/invoice/
├── page.tsx          # Main invoice component
└── README.md         # This documentation
```

## Features Included

### Company Information
- Company name
- Address (street, city, state, ZIP)
- Phone and email

### Client Information
- Client name
- Billing address
- Contact details

### Invoice Details
- Invoice number (auto-generated)
- Invoice date
- Due date
- Purchase order number

### Invoice Items
- Item description
- Quantity
- Unit rate
- Line total (auto-calculated)

### Financial Calculations
- Subtotal (sum of all items)
- Tax amount (configurable percentage)
- Discount amount
- Grand total

### Professional Features
- Clean, branded design
- Pixel Pilot logo integration
- Professional typography
- Consistent spacing and layout
- Mobile-responsive design

## Usage in Pixel Pilot

This invoice generator can be integrated into Pixel Pilot's workflow for:
- Client billing for development services
- Project quotes and estimates
- Professional service invoices
- Consulting and development work

## Customization

The invoice template can be easily customized by:
- Updating the company information
- Modifying the color scheme
- Adding custom fields
- Changing the layout structure
- Adding company branding elements
