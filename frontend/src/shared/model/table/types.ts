export interface TableColumn {
  field: string;
  label: string;
  type: string;
}

export interface TableMetadata {
  columns: TableColumn[];
}
