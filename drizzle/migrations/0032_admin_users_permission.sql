-- صلاحية صفحة المستخدمين: عرض/إضافة/تعديل/حذف، مغلقة افتراضيًا للمشرف والموظف
insert into public.role_permissions (role, resource, action, allowed)
select r.role, 'admin_users', a.action, false
from (values ('supervisor'::public.app_role), ('employee'::public.app_role)) as r(role)
cross join (values ('view'), ('add'), ('edit'), ('delete')) as a(action)
on conflict do nothing;