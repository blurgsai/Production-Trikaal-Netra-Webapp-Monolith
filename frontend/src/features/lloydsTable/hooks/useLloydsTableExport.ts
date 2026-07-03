import { useMutation } from "@tanstack/react-query";
import { exportTableData } from "../api/lloydsTableApi";

interface ExportField {
  field: string;
  label: string;
}

interface ExportPayload {
  format: "csv" | "xml" | "xls";
  fields: ExportField[];
  filters: unknown[];
}

export const useLloydsTableExport = () => {
  const mutation = useMutation({
    mutationFn: async ({ format, fields, filters }: ExportPayload) => {
      const response = await exportTableData(format, fields, filters);

      const blob = new Blob([response.data]);

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      const disposition = response.headers["content-disposition"];

      const fileName =
        disposition?.match(/filename="?([^"]+)"?/)?.[1] ??
        `lloyds-export.${format}`;

      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

      return {
        success: true,
      };
    },
  });

  return {
    exporting: mutation.isPending,
    handleExport: async (fields: any[], filters: any[], format: string) => {
      return mutation.mutateAsync({
        format: format as "csv" | "xml" | "xls",
        fields,
        filters,
      });
    },
  };
};
