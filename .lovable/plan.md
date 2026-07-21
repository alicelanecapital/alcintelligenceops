## 1. Reformat Round Gates panel (`src/components/DDInterviewEnhanced.tsx`, lines ~1282–1355)

Slick forest-green + white treatment.

- **Remove outer frame**: strip `p-6 bg-teal-50 border border-teal-200 rounded-lg` from the wrapping `<div>` — keep only top spacing (`mt-8 pt-6`).
- **Heading**: `✅ Round Gates` becomes `text-lg font-bold text-green-800`.
- **Inner "Clear to Proceed" card**: replace `bg-green-100 border-green-300` with `bg-white border border-green-800 rounded-lg p-5`; text `text-green-900`. Advance button switches from teal to forest green: `bg-green-800 hover:bg-green-900 text-white`.
- **Walk-Away block**: keep red semantics (`bg-white border border-red-600 text-red-800`) so it still reads as blocking, but drop the pink fill for a cleaner white card.
- **Hold/Terminate comment card**: switch `bg-gray-50 border-emerald-300` → `bg-white border border-green-800`; terminate variant `bg-white border border-red-600`. Confirm-hold button becomes forest green (`bg-green-800 hover:bg-green-900`).
- **Textarea**: `border-green-800 focus:ring-green-800` on white.
- **Secondary links** ("Do Not Proceed", "Terminate Deal"): keep as text links, tighten spacing.

## 2. Wrap horizontal stepper titles + abbreviate (`src/components/RoundStepper.tsx`)

Save horizontal space in the DD Interview stepper.

- Remove `whitespace-nowrap` from both the title and subtitle spans in the horizontal branch so long titles wrap onto a second line and subtitles wrap under that.
- Constrain each pill to a sensible max width (`max-w-[9rem]`) so wrapping actually kicks in instead of the row stretching.
- Replace every occurrence of "Due Diligence" with "DD" in the stepper labels. Since round titles come from the DD framework data (not hardcoded in the stepper), also apply the abbreviation at the render sites that feed `rounds` into `RoundStepper` — `src/components/DDInterviewEnhanced.tsx` and `src/routes/admin.dd-framework.tsx` — by mapping `title.replace(/Due Diligence/gi, 'DD')` before passing to the stepper. Underlying DB rows stay untouched.

## 3. Google `Error 403: org_internal` for ga@firstserve.co.za

Not a code bug — the OAuth consent screen for "ALC DD Engine" is set to **Internal** in Google Cloud Console, so accounts outside `alicelanecapital.com` are blocked before any app code runs.

Two options (pick one, no code required):

- **A. Switch consent screen to External** — Google Cloud Console → APIs & Services → OAuth consent screen → User Type: External → Save. Add ga@firstserve.co.za as a Test User while in Testing mode.
- **B. Keep Internal, bring the address into the org** — in Google Admin, create ga@firstserve.co.za as a user under alicelanecapital.com, or add firstserve.co.za as a secondary domain.

Say the word if you'd like an in-app note on the Accounts page explaining this to teammates.
