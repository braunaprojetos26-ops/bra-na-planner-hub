

## Plan: Fix 4 Security Findings + 2 Build Errors

### Analysis

All 4 findings are legitimate and need fixing. Additionally, there are 2 TypeScript build errors to resolve.

---

### 1. goal_milestones — Drop redundant `true` policies

The previous migration added scoped policies but **did not drop** the original permissive ones. Both sets coexist, and the `true` policies override the scoped ones.

**Action:** Migration to drop the 3 old policies:
- `"Authenticated users can view milestones"` (SELECT, `true`)
- `"Authenticated users can update milestones"` (UPDATE, `true`)
- `"Authenticated users can delete milestones"` (DELETE, `true`)

The scoped policies (`"Users can read/update/delete milestones for accessible contacts"`) already exist and will take effect.

---

### 2. import_jobs — Restrict UPDATE to job creator

The edge functions (`process-rd-import`, `process-rd-backfill-sources`) use **service role client**, which bypasses RLS entirely. So restricting the policy to `created_by = auth.uid()` is safe.

**Action:** Migration to drop old policy and create new one:
```sql
DROP POLICY "Service role can update import jobs" ON public.import_jobs;
CREATE POLICY "Users can update own import jobs" ON public.import_jobs
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
```

---

### 3. whatsapp_messages — Restrict INSERT to authenticated users

The edge function uses service role (bypasses RLS). The current policy allows unauthenticated inserts.

**Action:** Migration to replace the policy:
```sql
DROP POLICY "System can insert messages" ON public.whatsapp_messages;
CREATE POLICY "Authenticated users can insert messages for accessible contacts"
  ON public.whatsapp_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.id = whatsapp_messages.contact_id
    AND (c.owner_id = auth.uid() OR can_access_user(auth.uid(), c.owner_id)
         OR (c.owner_id IS NULL AND can_view_unassigned_contacts(auth.uid())))
  ));
```

---

### 4. vindi-webhook — Add API key authentication

Same pattern as `whatsapp-webhook`: validate an `X-API-Key` header against a secret `VINDI_WEBHOOK_SECRET`.

**Actions:**
- Add secret `VINDI_WEBHOOK_SECRET` via the secrets tool
- Update `supabase/functions/vindi-webhook/index.ts` to validate the API key before processing

---

### 5. Build Errors

**`ProjectEditor.tsx`** — Replace `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` (browser-compatible type).

**`useProducts.ts`** — Replace `require()` with dynamic `import()` or static import for `@/lib/pbFormulaParser`.

---

### Impact on Business Logic

None. All edge functions use service role clients (bypass RLS). The RLS changes only affect client-side access, which should already be scoped to the user's hierarchy. The Vindi webhook will require configuring an API key in both the backend secrets and the Vindi dashboard.

