import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { http, HttpResponse, delay } from "msw";
import type { ReactNode } from "react";

import { defenseTheme } from "@/shared/theme";
import { mockApi } from "@/test/server";
import VesselCountBadge from "../VesselCountBadge";

const GEOSERVER_BASE =
  import.meta.env.VITE_GEOSERVER_BASE_URL || "http://34.14.168.111:8090/geoserver";
const WORKSPACE = import.meta.env.VITE_GEOSERVER_WORKSPACE || "trikaalx";
const WFS_URL = `${GEOSERVER_BASE}/${WORKSPACE}/ows`;
const LAYER = `${WORKSPACE}:vessels`;

function renderWithProviders(component: ReactNode) {
  return render(
    <ThemeProvider theme={defenseTheme}>
      <CssBaseline />
      {component}
    </ThemeProvider>,
  );
}

function wfsCountXml(matched: number) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0"
  numberMatched="${matched}" numberReturned="0" timeStamp="2024-01-01T00:00:00Z">
</wfs:FeatureCollection>`;
}

function wfsCategoryJson(categories: { category: string }[]) {
  return HttpResponse.json({
    type: "FeatureCollection",
    totalFeatures: categories.length,
    numberMatched: categories.length,
    numberReturned: categories.length,
    features: categories.map((c, i) => ({
      type: "Feature",
      id: i + 1,
      properties: { category: c.category },
    })),
  });
}

beforeEach(() => {
  localStorage.setItem("token", "test-token");
});

describe("VesselCountBadge integration", () => {
  // ── Loading State ──────────────────────────────────────────────────────

  it("I-01: shows loading spinner while fetching vessel count", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, async () => {
        await delay(5000);
        return new HttpResponse(wfsCountXml(100), {
          headers: { "Content-Type": "application/xml" },
        });
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  // ── Success State ──────────────────────────────────────────────────────

  it("I-02: displays total vessel count on success", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("resultType") === "hits") {
          return new HttpResponse(wfsCountXml(42), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return wfsCategoryJson([{ category: "Cargo" }, { category: "Tanker" }]);
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 42/)).toBeInTheDocument();
    });
  });

  it("I-03: WFS count request uses correct parameters", async () => {
    let capturedUrl: URL | null = null;
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("resultType") === "hits") {
          capturedUrl = url;
          return new HttpResponse(wfsCountXml(10), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return wfsCategoryJson([]);
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(capturedUrl).not.toBeNull();
    });
    expect(capturedUrl!.searchParams.get("service")).toBe("WFS");
    expect(capturedUrl!.searchParams.get("request")).toBe("GetFeature");
    expect(capturedUrl!.searchParams.get("typeName")).toBe(LAYER);
    expect(capturedUrl!.searchParams.get("resultType")).toBe("hits");
  });

  it("I-04: expanding badge shows vessel category breakdown", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        if (request.url.includes("resultType=hits")) {
          return new HttpResponse(wfsCountXml(3), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return wfsCategoryJson([
          { category: "Cargo" },
          { category: "Tanker" },
          { category: "Fishing" },
        ]);
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 3/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Total vessels: 3/));

    await waitFor(() => {
      expect(screen.getByText("Vessel categories")).toBeInTheDocument();
    });
    expect(screen.getByText("Cargo")).toBeInTheDocument();
    expect(screen.getByText("Tanker")).toBeInTheDocument();
    expect(screen.getByText("Fishing")).toBeInTheDocument();
  });

  it("I-05: category counts are sorted by descending count", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        if (request.url.includes("resultType=hits")) {
          return new HttpResponse(wfsCountXml(6), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return wfsCategoryJson([
          { category: "Cargo" },
          { category: "Cargo" },
          { category: "Cargo" },
          { category: "Tanker" },
          { category: "Tanker" },
          { category: "Fishing" },
        ]);
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 6/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Total vessels: 6/));

    await waitFor(() => {
      expect(screen.getByText("Cargo")).toBeInTheDocument();
    });

    const cargoRow = screen.getByText("Cargo").closest("div");
    expect(cargoRow).toHaveTextContent("3");
    const tankerRow = screen.getByText("Tanker").closest("div");
    expect(tankerRow).toHaveTextContent("2");
  });

  // ── Error State ────────────────────────────────────────────────────────

  it("I-06: shows error message on WFS count failure", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, () =>
        HttpResponse.json({ error: "Server Error" }, { status: 500 }),
      ),
    );

    renderWithProviders(<VesselCountBadge />);

    // Error text is shown in the expanded panel — click badge to expand
    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 0/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText(/Total vessels: 0/));

    await waitFor(() => {
      expect(screen.getByText("Failed to load vessel count data")).toBeInTheDocument();
    });
  });

  it("I-07: shows error message on network failure", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, () => HttpResponse.error()),
    );

    renderWithProviders(<VesselCountBadge />);

    // Error text is shown in the expanded panel — click badge to expand
    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 0/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText(/Total vessels: 0/));

    await waitFor(() => {
      expect(screen.getByText("Failed to load vessel count data")).toBeInTheDocument();
    });
  });

  // ── Empty State ────────────────────────────────────────────────────────

  it("I-08: expanded panel shows no categories found when empty", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        if (request.url.includes("resultType=hits")) {
          return new HttpResponse(wfsCountXml(0), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return wfsCategoryJson([]);
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 0/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Total vessels: 0/));

    await waitFor(() => {
      expect(screen.getByText("No categories found")).toBeInTheDocument();
    });
  });

  // ── CQL Filter ─────────────────────────────────────────────────────────

  it("I-09: passes CQL_FILTER parameter when provided", async () => {
    let capturedCql: string | null = null;
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        const url = new URL(request.url);
        capturedCql = url.searchParams.get("CQL_FILTER");
        if (request.url.includes("resultType=hits")) {
          return new HttpResponse(wfsCountXml(5), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return wfsCategoryJson([{ category: "Navy" }]);
      }),
    );

    renderWithProviders(<VesselCountBadge cqlFilter="category = 'Navy'" />);

    await waitFor(() => {
      expect(capturedCql).toBe("category = 'Navy'");
    });
  });

  // ── Collapse / Expand ──────────────────────────────────────────────────

  it("I-10: clicking badge toggles expanded category panel", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        if (request.url.includes("resultType=hits")) {
          return new HttpResponse(wfsCountXml(2), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return wfsCategoryJson([{ category: "Cargo" }, { category: "Tanker" }]);
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 2/)).toBeInTheDocument();
    });

    expect(screen.queryByText("Vessel categories")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(/Total vessels: 2/));
    expect(screen.getByText("Vessel categories")).toBeInTheDocument();

    await userEvent.click(screen.getByText(/Total vessels: 2/));
    expect(screen.queryByText("Vessel categories")).not.toBeInTheDocument();
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────

  it("E-01: handles vessels with null category as Unknown", async () => {
    mockApi.use(
      http.get(`${WFS_URL}`, ({ request }) => {
        if (request.url.includes("resultType=hits")) {
          return new HttpResponse(wfsCountXml(2), {
            headers: { "Content-Type": "application/xml" },
          });
        }
        return HttpResponse.json({
          type: "FeatureCollection",
          totalFeatures: 2,
          numberMatched: 2,
          numberReturned: 2,
          features: [
            { type: "Feature", id: 1, properties: { category: null } },
            { type: "Feature", id: 2, properties: {} },
          ],
        });
      }),
    );

    renderWithProviders(<VesselCountBadge />);

    await waitFor(() => {
      expect(screen.getByText(/Total vessels: 2/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Total vessels: 2/));

    await waitFor(() => {
      expect(screen.getAllByText("Unknown")).toHaveLength(1);
    });
  });
});
