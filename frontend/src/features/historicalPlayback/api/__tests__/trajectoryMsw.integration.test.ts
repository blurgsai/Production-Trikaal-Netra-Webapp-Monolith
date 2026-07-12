import { describe, it, expect, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { mockApi } from "@/test/server";

import { fetchVesselTrajectories } from "../historicalPlaybackApi";
import { TrajectoryBufferManager } from "../../model/dataBufferManager";
import { mapTrajectoryRequestToApi, mapTrajectoryResponse } from "../../model/mappers";
import type { PlaybackFilter, TrajectoryRequest } from "../../model/types";
import type { TrajectoryRequestApi } from "../types";

const domainFetchFn = (payload: TrajectoryRequest) =>
  fetchVesselTrajectories(mapTrajectoryRequestToApi(payload)).then(
    mapTrajectoryResponse,
  );

const VITE_BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";

const mockGeometry: GeoJSON.Geometry = {
  type: "Polygon",
  coordinates: [
    [
      [65, 15],
      [66, 15],
      [66, 16],
      [65, 16],
      [65, 15],
    ],
  ],
};

const SAMPLE_RESPONSE = {
  trajectories: {
    "366500659123456789": [
      { ts: "2024-12-04T16:00:00Z", lat: 15.9, lon: 65.2, heading: 45, speed: 10.5 },
      { ts: "2024-12-04T16:00:30Z", lat: 15.91, lon: 65.21, heading: 46, speed: 10.2 },
    ],
    "366168522123456789": [
      { ts: "2024-12-04T16:00:00Z", lat: 15.89, lon: 65.27, heading: 0, speed: 8.0 },
    ],
  },
  timestamps: ["2024-12-04T16:00:00Z", "2024-12-04T16:00:30Z"],
};

describe("Trajectory pipeline integration (MSW: dataBufferManager → API → network)", () => {
  afterEach(() => {
    mockApi.resetHandlers();
  });

  // ── API function → MSW ──

  it("fetchVesselTrajectories sends POST with filters to /vessels/trajectory", async () => {
    let capturedBody: TrajectoryRequestApi;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, async ({ request }) => {
        capturedBody = (await request.json()) as TrajectoryRequestApi;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    await fetchVesselTrajectories({
      polygon: mockGeometry,
      start_time: "2024-12-04T16:00:00Z",
      end_time: "2024-12-04T17:00:00Z",
      filters: [
        { column: "speed", operator: "gt", value: "5" },
        { column: "shipname", operator: "like", value: "%CARGO%", combinator: "AND" },
      ],
    });

    expect(capturedBody!.filters).toHaveLength(2);
    expect(capturedBody!.filters![0].column).toBe("speed");
    expect(capturedBody!.filters![1].column).toBe("shipname");
    expect(capturedBody!.filters![1].combinator).toBe("AND");
  });

  it("fetchVesselTrajectories sends POST without filters when undefined", async () => {
    let capturedBody: TrajectoryRequestApi;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, async ({ request }) => {
        capturedBody = (await request.json()) as TrajectoryRequestApi;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    await fetchVesselTrajectories({
      polygon: mockGeometry,
      start_time: "2024-12-04T16:00:00Z",
      end_time: "2024-12-04T17:00:00Z",
    });

    expect(capturedBody!.filters).toBeUndefined();
  });

  it("fetchVesselTrajectories sends Authorization header with token", async () => {
    let capturedHeaders: Headers;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    await fetchVesselTrajectories({
      polygon: mockGeometry,
      start_time: "2024-12-04T16:00:00Z",
      end_time: "2024-12-04T17:00:00Z",
      filters: [{ column: "speed", operator: "gt", value: "5" }],
    });

    expect(capturedHeaders!.get("Authorization")).toBe("Bearer test-token");
  });

  it("fetchVesselTrajectories returns parsed response with trajectories and timestamps", async () => {
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, () => {
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    const result = await fetchVesselTrajectories({
      polygon: mockGeometry,
      start_time: "2024-12-04T16:00:00Z",
      end_time: "2024-12-04T17:00:00Z",
      filters: [{ column: "speed", operator: "gt", value: "5" }],
    });

    expect(result.trajectories).toBeDefined();
    expect(result.timestamps).toHaveLength(2);
    expect(result.trajectories["366500659123456789"]).toHaveLength(2);
    expect(result.trajectories["366500659123456789"][0].speed).toBe(10.5);
  });

  it("fetchVesselTrajectories propagates network error on 500", async () => {
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, () => {
        return HttpResponse.json(
          { detail: "ClickHouse error" },
          { status: 500 },
        );
      }),
    );

    await expect(
      fetchVesselTrajectories({
        polygon: mockGeometry,
        start_time: "2024-12-04T16:00:00Z",
        end_time: "2024-12-04T17:00:00Z",
        filters: [{ column: "speed", operator: "gt", value: "5" }],
      }),
    ).rejects.toThrow();
  });

  it("fetchVesselTrajectories propagates 404 error", async () => {
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, () => {
        return HttpResponse.json(
          { detail: "No data found" },
          { status: 404 },
        );
      }),
    );

    await expect(
      fetchVesselTrajectories({
        polygon: mockGeometry,
        start_time: "2024-12-04T16:00:00Z",
        end_time: "2024-12-04T17:00:00Z",
        filters: [{ column: "speed", operator: "gt", value: "999" }],
      }),
    ).rejects.toThrow();
  });

  // ── dataBufferManager → fetchVesselTrajectories → MSW ──

  it("TrajectoryBufferManager sends mapped filters through real API function to MSW", async () => {
    let capturedBody: TrajectoryRequestApi;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, async ({ request }) => {
        capturedBody = (await request.json()) as TrajectoryRequestApi;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    const filters: PlaybackFilter[] = [
      { field: "speed", operator: "gt", value: "5" },
      { field: "shipName", operator: "like", value: "%CARGO%", combinator: "AND" },
    ];

    const manager = new TrajectoryBufferManager(
      "2024-12-04T16:00:00Z",
      "2024-12-04T17:00:00Z",
      mockGeometry,
      "minute",
      filters,
      domainFetchFn,
    );

    const data = await manager.getChunkData(0);

    expect(capturedBody!.filters).toHaveLength(2);
    // Domain fields mapped to DB columns
    expect(capturedBody!.filters![0].column).toBe("speed");
    expect(capturedBody!.filters![1].column).toBe("shipname");
    expect(capturedBody!.polygon).toEqual(mockGeometry);
    // Response mapped back to domain model
    expect(data.vessels["366500659123456789"]).toHaveLength(2);
    expect(data.vessels["366500659123456789"][0].latitude).toBe(15.9);
  });

  it("TrajectoryBufferManager without filters sends undefined filters to MSW", async () => {
    let capturedBody: TrajectoryRequestApi;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, async ({ request }) => {
        capturedBody = (await request.json()) as TrajectoryRequestApi;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    const manager = new TrajectoryBufferManager(
      "2024-12-04T16:00:00Z",
      "2024-12-04T17:00:00Z",
      mockGeometry,
      "minute",
      [],
      domainFetchFn,
    );

    await manager.getChunkData(0);

    expect(capturedBody!.filters).toBeUndefined();
  });

  it("TrajectoryBufferManager with OR combinator sends correct combinator to MSW", async () => {
    let capturedBody: TrajectoryRequestApi;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, async ({ request }) => {
        capturedBody = (await request.json()) as TrajectoryRequestApi;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    const manager = new TrajectoryBufferManager(
      "2024-12-04T16:00:00Z",
      "2024-12-04T17:00:00Z",
      mockGeometry,
      "minute",
      [
        { field: "speed", operator: "gt", value: "5" },
        { field: "heading", operator: "eq", value: "0", combinator: "OR" },
      ],
      domainFetchFn,
    );

    await manager.getChunkData(0);

    expect(capturedBody!.filters![1].combinator).toBe("OR");
  });

  it("TrajectoryBufferManager caches chunk — second call does not hit MSW", async () => {
    let callCount = 0;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, () => {
        callCount++;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    const manager = new TrajectoryBufferManager(
      "2024-12-04T16:00:00Z",
      "2024-12-04T17:00:00Z",
      mockGeometry,
      "minute",
      [{ field: "speed", operator: "gt", value: "5" }],
      domainFetchFn,
    );

    await manager.getChunkData(0);
    await manager.getChunkData(0);

    expect(callCount).toBe(1);
  });

  it("TrajectoryBufferManager handleSliderChange fetches correct chunk via MSW", async () => {
    let capturedBody: TrajectoryRequestApi;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, async ({ request }) => {
        capturedBody = (await request.json()) as TrajectoryRequestApi;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    const manager = new TrajectoryBufferManager(
      "2024-12-04T16:00:00Z",
      "2024-12-04T17:00:00Z",
      mockGeometry,
      "minute",
      [{ field: "speed", operator: "lte", value: "20" }],
      domainFetchFn,
    );

    const result = await manager.handleSliderChange(65);

    expect(result.chunkOffset).toBe(1);
    expect(capturedBody!.filters![0].operator).toBe("lte");
    expect(capturedBody!.filters![0].value).toBe("20");
  });

  it("TrajectoryBufferManager maps all filter fields to correct DB columns in MSW request", async () => {
    let capturedBody: TrajectoryRequestApi;
    mockApi.use(
      http.post(`${VITE_BASE_URL}/vessels/trajectory`, async ({ request }) => {
        capturedBody = (await request.json()) as TrajectoryRequestApi;
        return HttpResponse.json(SAMPLE_RESPONSE);
      }),
    );

    const allFilters: PlaybackFilter[] = [
      { field: "vesselId", operator: "eq", value: "1" },
      { field: "mmsi", operator: "eq", value: "2", combinator: "AND" },
      { field: "speed", operator: "gt", value: "3", combinator: "AND" },
      { field: "heading", operator: "eq", value: "4", combinator: "AND" },
      { field: "course", operator: "eq", value: "5", combinator: "AND" },
      { field: "navigationStatus", operator: "eq", value: "6", combinator: "AND" },
      { field: "latitude", operator: "eq", value: "7", combinator: "AND" },
      { field: "longitude", operator: "eq", value: "8", combinator: "AND" },
      { field: "shipName", operator: "like", value: "9", combinator: "AND" },
      { field: "destination", operator: "eq", value: "10", combinator: "AND" },
      { field: "callsign", operator: "eq", value: "11", combinator: "AND" },
    ];

    const manager = new TrajectoryBufferManager(
      "2024-12-04T16:00:00Z",
      "2024-12-04T17:00:00Z",
      mockGeometry,
      "minute",
      allFilters,
      domainFetchFn,
    );

    await manager.getChunkData(0);

    const columns = capturedBody!.filters!.map((f) => f.column);
    expect(columns).toEqual([
      "vessel_id",
      "mmsi",
      "speed",
      "heading",
      "course",
      "status",
      "lat",
      "lon",
      "shipname",
      "destination",
      "callsign",
    ]);
  });
});
