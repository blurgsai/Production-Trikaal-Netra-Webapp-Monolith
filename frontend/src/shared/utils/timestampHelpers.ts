export const timestampToMs = (value: unknown): number | null => {
  if (value == null || value === "") {
    return null;
  }

  try {
    if (typeof value === "string" && /[A-Za-z:-]/.test(value)) {
      const parsed = new Date(value).getTime();

      return Number.isFinite(parsed) ? parsed : null;
    }

    const strVal = String(value).trim();

    if (!/^\d+$/.test(strVal)) {
      return null;
    }

    const len = strVal.length;

    if (len === 19) {
      return Number(BigInt(strVal) / BigInt(1000000));
    }

    if (len === 10) {
      return Number(strVal) * 1000;
    }

    if (len >= 13) {
      return len > 15 ? Number(BigInt(strVal)) : Number(strVal);
    }

    return Number(strVal);
  } catch {
    return null;
  }
};

export const msToNanoseconds = (ms: number): string => {
  return (BigInt(Math.floor(ms)) * BigInt(1000000)).toString();
};
