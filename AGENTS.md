<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Add/edit dialogs are defined in DB tables forms/form_fields/form_field_options and rendered by src/components/DynamicForm.tsx; custom fields save to each table's extra jsonb (custom forms to form_entries) — why: admins manage forms without code changes.

- Permissions: role_permissions + user_permission_overrides resolved by SQL can(uid,resource,action) in RLS and by useAuth().can() in UI; admin always allowed; resources/actions are declared in src/lib/permissions.ts (custom forms are dynamic `form:<key>` seeded from the `custom_forms` template by trigger; admin pages are `admin_*` with view only; users/permissions pages stay admin-only) — why: admins configure supervisor/employee access without code, and new sections get permissions by adding one entry.
- Data tables opt into the shared ledger-rows utility; sponsor history is scoped by source table and transfer ID — why: row colors stay consistent and history cannot mix records across transfer types.
- Transfer detail sections and fixed blocks use a single ordered list in the form settings, with sponsor history last by default — why: administrators can place every visible detail block without changing data records.
- Form fields feed grid columns via GRID_FORMS in gridSettings: unbound fields appear automatically, bound fields not built into the grid are added from table settings (rendered by DataGrid) — why: admins choose table columns from form fields without code changes.
- Inside a transfer detail part, consecutive fields sharing `form_fields.settings.group` render under that title with a divider between groups (helper `detailGroups` in src/lib/forms.ts, edited from the details-parts card) — why: admins split one part into labelled blocks (e.g. old vs new sponsor) without adding a new part or changing code.
