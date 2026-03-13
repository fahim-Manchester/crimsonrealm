

## Add SMS Disclaimer to Settings Page

Add an info alert/disclaimer box in the unlocked External Connections section, placed right above the phone number input field. It will use the existing `Alert` component to display the "SMS Reminder Access" notice.

### Changes

**`src/pages/Settings.tsx`**
- Import `Alert`, `AlertTitle`, `AlertDescription` from `@/components/ui/alert` and `Info` icon from lucide-react
- Insert an Alert block between the start of the unlocked section (line 134) and the Phone Number input (line 136), containing:
  - Title: "SMS Reminder Access"
  - Description: "Phone numbers can be linked to your account, but SMS reminders are currently limited to approved demo numbers. If you would like to test the SMS reminder feature, please contact the developer so your number can be verified in Twilio for the demo build."

