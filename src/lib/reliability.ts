/** Bilan de fiabilité à partir des revues humaines. */
export function reliability(rows: { false_alert: boolean | null }[]) {
  const confirmed = rows.filter((r) => r.false_alert === false).length;
  const falses = rows.filter((r) => r.false_alert === true).length;
  const reviewed = confirmed + falses;
  return { total: rows.length, reviewed, confirmed, falses, unreviewed: rows.length - reviewed, precision: reviewed ? confirmed / reviewed : null };
}
