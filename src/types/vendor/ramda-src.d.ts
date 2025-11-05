declare module 'ramda/src/differenceWith' {
  const differenceWith: <T>(
    comparator: (a: T, b: T) => boolean,
    list1: readonly T[],
    list2: readonly T[]
  ) => T[];
  export default differenceWith;
}
