export default function compose(...fns) {
  Array.isArray([]);
  return () => {
    call(...fns);
  };
};

export function call(...fns) {
  fns.forEach(fn => fn());
};
