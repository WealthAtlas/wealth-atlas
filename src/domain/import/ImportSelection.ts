import { definesRef, dependsOnRef, ValidatedOperation } from './ImportOperation';

/**
 * Which operations of a plan the user has approved.
 *
 * A transaction can attach to an asset the same plan creates, and a payment to a
 * loan the same plan creates. Approving the child without the parent cannot be
 * applied — the executor has no id to resolve the ref to, so it throws and rolls
 * the whole batch back after the user has already pressed Apply. The selection
 * therefore keeps a child and its parent together rather than letting the pair
 * come apart.
 */

function indexByDefinedRef(operations: ValidatedOperation[]): Map<string, number> {
  const byRef = new Map<string, number>();
  operations.forEach((item, index) => {
    const ref = definesRef(item.operation);
    if (ref !== undefined && !byRef.has(ref)) byRef.set(ref, index);
  });
  return byRef;
}

/** Clears any child whose parent create is not selected. */
export function withoutOrphans(operations: ValidatedOperation[], selected: boolean[]): boolean[] {
  const byRef = indexByDefinedRef(operations);

  return operations.map((item, index) => {
    if (!selected[index]) return false;
    const ref = dependsOnRef(item.operation);
    if (ref === undefined) return true;
    const parent = byRef.get(ref);
    return parent !== undefined && selected[parent];
  });
}

/**
 * Ticked by default only when the operation is clean — anything flagged as
 * unverified, duplicate or destructive starts unticked so including it is a
 * deliberate act. A clean transaction hanging off a flagged create is unticked
 * too, since its parent is.
 */
export function defaultSelection(operations: ValidatedOperation[]): boolean[] {
  return withoutOrphans(
    operations,
    operations.map(item => item.flags.length === 0)
  );
}

export function selectAll(operations: ValidatedOperation[]): boolean[] {
  return operations.map(() => true);
}

export function selectNone(operations: ValidatedOperation[]): boolean[] {
  return operations.map(() => false);
}

/**
 * Flips one operation, carrying its dependencies with it: ticking a child ticks
 * the create it needs, and unticking a create unticks everything that needs it.
 */
export function toggleSelection(
  operations: ValidatedOperation[],
  selected: boolean[],
  index: number
): boolean[] {
  const next = [...selected];
  const turningOn = !selected[index];
  next[index] = turningOn;

  const operation = operations[index].operation;

  if (turningOn) {
    const ref = dependsOnRef(operation);
    if (ref !== undefined) {
      const parent = indexByDefinedRef(operations).get(ref);
      if (parent !== undefined) next[parent] = true;
    }
    return next;
  }

  const defined = definesRef(operation);
  if (defined !== undefined) {
    operations.forEach((item, i) => {
      if (dependsOnRef(item.operation) === defined) next[i] = false;
    });
  }

  return next;
}
