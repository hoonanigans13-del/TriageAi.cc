# Implementation Plan - Add Subscription Link

This plan covers adding a subscription link/button to the application to allow users to access `https://triageai.cc/subscribe`.

## Proposed Changes

### UI Components

#### [MODIFY] [activity_triage.xml](file:///C:/Users/twizt/StudioProjects/TriageAi.cc/app/src/main/res/layout/activity_triage.xml)
- Add a new "Subscribe" button as a separate element below the "SUMMARIZE EMAIL" button.
- Style it to be distinct but consistent with the dark theme.

#### [MODIFY] [TriageActivity.kt](file:///C:/Users/twizt/StudioProjects/TriageAi.cc/app/src/main/java/com/triage/ai/TriageActivity.kt)
- Add a click listener for the new `btnSubscribe`.
- Implement the `Intent.ACTION_VIEW` logic:
  ```kotlin
  val intent = Intent(Intent.ACTION_VIEW)
  intent.data = Uri.parse("https://triageai.cc/subscribe")
  startActivity(intent)
  ```

#### [MODIFY] [strings.xml](file:///C:/Users/twizt/StudioProjects/TriageAi.cc/app/src/main/res/values/strings.xml)
- Add a new string resource for the "Subscribe" text.

## Verification Plan

### Manual Verification
- Deploy the app to a device/emulator.
- Verify the "Subscribe" button appears correctly in `TriageActivity`.
- Click the button and ensure it opens the browser to the correct URL.
