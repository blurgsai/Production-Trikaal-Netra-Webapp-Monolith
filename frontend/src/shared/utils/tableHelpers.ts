export const formatOperatorLabel = (operator: string): string => {
  const labels: Record<string, string> = {
    eq: "Equals",
    ne: "Not Equals",
    gt: "Greater Than",
    gte: "Greater Than or Equal",
    lt: "Less Than",
    lte: "Less Than or Equal",
    between: "Between",
    contains: "Contains",
    startsWith: "Starts With",
    endsWith: "Ends With",
  };

  return labels[operator] || operator;
};

export const getOperatorsByType = (fieldType: string) => {
  const baseOperators = [
    { value: "eq", label: "Equals" },
    { value: "ne", label: "Not Equals" },
  ];

  if (fieldType === "string") {
    return [
      ...baseOperators,
      { value: "contains", label: "Contains" },
      { value: "startsWith", label: "Starts With" },
      { value: "endsWith", label: "Ends With" },
    ];
  }

  if (
    fieldType === "number" ||
    fieldType === "integer" ||
    fieldType === "timestamp"
  ) {
    return [
      ...baseOperators,
      { value: "gt", label: "Greater Than" },
      { value: "gte", label: "Greater Than or Equal" },
      { value: "lt", label: "Less Than" },
      { value: "lte", label: "Less Than or Equal" },
      { value: "between", label: "Between" },
    ];
  }

  return baseOperators;
};
