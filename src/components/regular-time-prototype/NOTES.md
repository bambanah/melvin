# Regular Time set-up prototype (#502)

Question: how does the Provider enter, edit and clear a Client's Regular Time (start/end, Support Item, travel yes/no)?

Variants, on `/dashboard/clients/[id]?variant=`:

- A - Inline section: a "Regular time" section on the Client page, read view with edit and clear icons, editing in place.
- B - On the Client form: a ticked "same work every time" block on `/edit`; the Client page only reads it back as a fact.
- C - Header action + dialog: the header's primary action opens a dialog (drawer on phones); the eyebrow reads it back.
- D - Editable sentence: "Usually 2:35pm to 4:35pm as X, no travel." with each word its own popover editor.

Verdict: A. Regular Time is set up from a "Regular time" `DetailSection` on the Client page, between Details and Custom rates. Empty, it says so and offers "Set regular time"; set, it shows Time / Support Item / Provider Travel as a `FactList` with edit and clear icon buttons; editing swaps the section for the fields with Save / Cancel in place. It stays off the Client form.
