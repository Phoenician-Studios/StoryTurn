-- Relation of each adult family member to the kids.

alter table public.family_members
  add column if not exists relation_to_children text not null default 'other';

alter table public.family_members
  drop constraint if exists family_members_relation_to_children_check;

alter table public.family_members
  add constraint family_members_relation_to_children_check
  check (
    relation_to_children in (
      'parent',
      'grandparent',
      'aunt_uncle',
      'sibling',
      'caregiver',
      'other'
    )
  );
