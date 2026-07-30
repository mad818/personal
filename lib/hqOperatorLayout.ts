export function resolveHqCompactOperator(input: {
  phonePosture: boolean;
  hqCompactOperatorLayout?: boolean;
}): boolean {
  return input.phonePosture || Boolean(input.hqCompactOperatorLayout);
}
