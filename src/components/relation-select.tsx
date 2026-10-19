import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} name={name} defaultValue={defaultValue} required>
        {CHILD_RELATIONS.map((value) => (
          <option key={value} value={value}>
            {childRelationLabel(value)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
