import { Label } from "@/components/ui/label";
import {
  CHILD_RELATIONS,
  childRelationLabel,
  type ChildRelation,
} from "@/lib/domain/relations";

export function RelationSelect({
  id = "relationToChildren",
  name = "relationToChildren",
  defaultValue = "other",
  label = "Relation to the kids",
}: {
  id?: string;
  name?: string;
  defaultValue?: ChildRelation;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        defaultValue={defaultValue}
        required
      >
        {CHILD_RELATIONS.map((value) => (
          <option key={value} value={value}>
            {childRelationLabel(value)}
          </option>
        ))}
      </select>
    </div>
  );
}
