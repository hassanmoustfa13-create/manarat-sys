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

- Permissions: role_permissions + user_permission_overrides resolved by SQL can(uid,resource,action) in RLS and by useAuth().can() in UI; admin always allowed — why: admins configure supervisor/employee access without code.
