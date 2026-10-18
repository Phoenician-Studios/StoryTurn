export const CHILD_RELATIONS = [
  "parent",
  "grandparent",
  "aunt_uncle",
  "sibling",
  "caregiver",
  "other",
] as const;

export type ChildRelation = (typeof CHILD_RELATIONS)[number];

const LABELS: Record<ChildRelation, string> = {
  parent: "Parent",
  grandparent: "Grandparent",
  aunt_uncle: "Aunt / Uncle",
  sibling: "Sibling",
  caregiver: "Caregiver",
  other: "Other",
};

export function isChildRelation(value: string): value is ChildRelation {
  return (CHILD_RELATIONS as readonly string[]).includes(value);
}

export function parseChildRelation(
  value: unknown,
  fallback: ChildRelation = "other",
): ChildRelation {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return isChildRelation(normalized) ? normalized : fallback;
}

export function childRelationLabel(relation: ChildRelation): string {
  return LABELS[relation];
}
