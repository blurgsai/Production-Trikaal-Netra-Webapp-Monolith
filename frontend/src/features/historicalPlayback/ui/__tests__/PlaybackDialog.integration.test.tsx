import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PlaybackDialog from "../PlaybackDialog";

import type { PlaybackRange, PlaybackFilter, TimeGranularity } from "../../model/types";

describe("PlaybackDialog (integration: component → user interaction)", () => {
  const defaultProps = (overrides?: Partial<PlaybackDialogProps>) => ({
    open: true,
    onClose: vi.fn(),
    playbackRange: { start: "2024-12-04T21:30", end: "2024-12-04T21:40" } as PlaybackRange,
    setPlaybackRange: vi.fn(),
    granularity: "minute" as TimeGranularity,
    onGranularityChange: vi.fn(),
    onApply: vi.fn(),
    filters: [] as PlaybackFilter[],
    onFiltersChange: vi.fn(),
    isPlaying: false,
    ...overrides,
  });

  type PlaybackDialogProps = {
    open: boolean;
    onClose: () => void;
    playbackRange: PlaybackRange;
    setPlaybackRange: React.Dispatch<React.SetStateAction<PlaybackRange>>;
    granularity: TimeGranularity;
    onGranularityChange: (g: TimeGranularity) => void;
    onApply: () => void;
    filters: PlaybackFilter[];
    onFiltersChange: React.Dispatch<React.SetStateAction<PlaybackFilter[]>>;
    isPlaying?: boolean;
  };

  it("renders dialog title when open", () => {
    render(<PlaybackDialog {...defaultProps()} />);
    expect(screen.getByText("Playback Configuration")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<PlaybackDialog {...defaultProps({ open: false })} />);
    expect(screen.queryByText("Playback Configuration")).not.toBeInTheDocument();
  });

  it("shows Start DateTime and End DateTime labels", () => {
    render(<PlaybackDialog {...defaultProps()} />);
    expect(screen.getByLabelText("Start")).toBeInTheDocument();
    expect(screen.getByLabelText("End")).toBeInTheDocument();
  });

  it("displays current playback range values", () => {
    render(<PlaybackDialog {...defaultProps()} />);
    expect(screen.getByLabelText("Start")).toHaveValue("2024-12-04T21:30");
    expect(screen.getByLabelText("End")).toHaveValue("2024-12-04T21:40");
  });

  it("calls onClose when Start over button clicked", async () => {
    const onClose = vi.fn();
    render(<PlaybackDialog {...defaultProps({ onClose })} />);
    await userEvent.click(screen.getByText("Start over"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onApply when Play button clicked", async () => {
    const onApply = vi.fn();
    render(<PlaybackDialog {...defaultProps({ onApply })} />);
    await userEvent.click(screen.getByText("Play"));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it("disables Play button when start is empty", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          playbackRange: { start: "", end: "2024-12-04T21:40" },
        })}
      />,
    );
    expect(screen.getByText("Play")).toBeDisabled();
  });

  it("disables Play button when end is empty", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          playbackRange: { start: "2024-12-04T21:30", end: "" },
        })}
      />,
    );
    expect(screen.getByText("Play")).toBeDisabled();
  });

  it("enables Play button when both dates are set", () => {
    render(<PlaybackDialog {...defaultProps()} />);
    expect(screen.getByText("Play")).not.toBeDisabled();
  });

  it("calls setPlaybackRange when start datetime changes", async () => {
    const setPlaybackRange = vi.fn();
    render(<PlaybackDialog {...defaultProps({ setPlaybackRange })} />);
    const startInput = screen.getByLabelText("Start");
    fireEvent.change(startInput, { target: { value: "2024-12-04T22:00" } });
    expect(setPlaybackRange).toHaveBeenCalledTimes(1);
  });

  it("calls setPlaybackRange when end datetime changes", async () => {
    const setPlaybackRange = vi.fn();
    render(<PlaybackDialog {...defaultProps({ setPlaybackRange })} />);
    const endInput = screen.getByLabelText("End");
    fireEvent.change(endInput, { target: { value: "2024-12-04T22:30" } });
    expect(setPlaybackRange).toHaveBeenCalledTimes(1);
  });

  it("renders granularity selector with all four options", () => {
    render(<PlaybackDialog {...defaultProps()} />);
    expect(screen.getByText("Minute")).toBeInTheDocument();
    expect(screen.getByText("Hour")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
  });

  it("highlights selected granularity (minute)", () => {
    render(<PlaybackDialog {...defaultProps({ granularity: "minute" })} />);
    const minuteBtn = screen.getByText("Minute").closest("button");
    expect(minuteBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("highlights selected granularity (hour)", () => {
    render(<PlaybackDialog {...defaultProps({ granularity: "hour" })} />);
    const hourBtn = screen.getByText("Hour").closest("button");
    expect(hourBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onGranularityChange when Hour is clicked", async () => {
    const onGranularityChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({ onGranularityChange, granularity: "minute" })}
      />,
    );
    await userEvent.click(screen.getByText("Hour"));
    expect(onGranularityChange).toHaveBeenCalledWith("hour");
  });

  it("calls onGranularityChange when Day is clicked", async () => {
    const onGranularityChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({ onGranularityChange, granularity: "minute" })}
      />,
    );
    await userEvent.click(screen.getByText("Day"));
    expect(onGranularityChange).toHaveBeenCalledWith("day");
  });

  it("calls onGranularityChange when Week is clicked", async () => {
    const onGranularityChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({ onGranularityChange, granularity: "minute" })}
      />,
    );
    await userEvent.click(screen.getByText("Week"));
    expect(onGranularityChange).toHaveBeenCalledWith("week");
  });

  it("does not call onGranularityChange when same granularity is clicked", async () => {
    const onGranularityChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({ onGranularityChange, granularity: "minute" })}
      />,
    );
    await userEvent.click(screen.getByText("Minute"));
    // ToggleButton with exclusive + same value sends null, which we guard against
    expect(onGranularityChange).not.toHaveBeenCalled();
  });

  // ── Filter UI integration tests ──

  it("shows 'No filters applied' message when filters array is empty", () => {
    render(<PlaybackDialog {...defaultProps({ filters: [] })} />);
    expect(
      screen.getByText(/No filters applied/i),
    ).toBeInTheDocument();
  });

  it("does not show 'No filters applied' message when filters exist", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    expect(screen.queryByText(/No filters applied/i)).not.toBeInTheDocument();
  });

  it("renders 'Add filter' button", () => {
    render(<PlaybackDialog {...defaultProps()} />);
    expect(screen.getByText("Add filter")).toBeInTheDocument();
  });

  it("calls onFiltersChange when 'Add filter' is clicked", async () => {
    const onFiltersChange = vi.fn();
    render(<PlaybackDialog {...defaultProps({ onFiltersChange })} />);
    await userEvent.click(screen.getByText("Add filter"));
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    // The callback should be a function (SetStateAction)
    expect(typeof onFiltersChange.mock.calls[0][0]).toBe("function");
  });

  it("renders existing filter with correct field value", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // The field Select should display "Speed (knots)" label
    expect(screen.getByText("Speed (knots)")).toBeInTheDocument();
  });

  it("renders existing filter with correct operator value", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // The operator Select should display ">" label
    expect(screen.getByText(">")).toBeInTheDocument();
  });

  it("renders existing filter with correct text value", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // The value TextField should display "10"
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("renders text field placeholder for text-based filter fields", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "shipName", operator: "like", value: "" },
          ],
        })}
      />,
    );
    expect(screen.getByPlaceholderText("Text")).toBeInTheDocument();
  });

  it("renders number field placeholder for numeric filter fields", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "" },
          ],
        })}
      />,
    );
    expect(screen.getByPlaceholderText("Number")).toBeInTheDocument();
  });

  it("calls onFiltersChange when filter field is changed", async () => {
    const onFiltersChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({
          onFiltersChange,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // Open the field Select and pick a different option
    const fieldSelect = screen.getByText("Speed (knots)");
    await userEvent.click(fieldSelect);
    const mmsiOption = screen.getByText("MMSI");
    await userEvent.click(mmsiOption);
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
  });

  it("calls onFiltersChange when filter operator is changed", async () => {
    const onFiltersChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({
          onFiltersChange,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    const operatorSelect = screen.getByText(">");
    await userEvent.click(operatorSelect);
    const lteOption = screen.getByText("<=");
    await userEvent.click(lteOption);
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
  });

  it("calls onFiltersChange when filter value is changed", () => {
    const onFiltersChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({
          onFiltersChange,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    const valueInput = screen.getByDisplayValue("10");
    fireEvent.change(valueInput, { target: { value: "25" } });
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
  });

  it("calls onFiltersChange when combinator is changed", async () => {
    const onFiltersChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({
          onFiltersChange,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
            { field: "heading", operator: "eq", value: "0", combinator: "AND" },
          ],
        })}
      />,
    );
    // The combinator Select should display "AND"
    const combinatorSelect = screen.getAllByText("AND")[0];
    await userEvent.click(combinatorSelect);
    const orOption = screen.getByText("OR");
    await userEvent.click(orOption);
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
  });

  it("does not render combinator selector for first filter", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // Only one filter — no combinator Select should be visible
    // The only "AND"/"OR" text would be from the combinator selector
    expect(screen.queryByText("AND")).not.toBeInTheDocument();
    expect(screen.queryByText("OR")).not.toBeInTheDocument();
  });

  it("renders combinator selector for second and subsequent filters", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
            { field: "heading", operator: "eq", value: "0", combinator: "OR" },
          ],
        })}
      />,
    );
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("calls onFiltersChange when delete button is clicked", async () => {
    const onFiltersChange = vi.fn();
    const { container } = render(
      <PlaybackDialog
        {...defaultProps({
          onFiltersChange,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // Find the delete IconButton by its DeleteOutlineIcon svg
    const deleteButton = container.querySelector(
      'button[aria-label="Delete"]',
    ) || screen.getByTestId("DeleteOutlineIcon").closest("button");
    await userEvent.click(deleteButton!);
    expect(onFiltersChange).toHaveBeenCalledTimes(1);
  });

  it("renders multiple filter rows correctly", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
            { field: "shipName", operator: "like", value: "%CARGO%", combinator: "AND" },
            { field: "heading", operator: "eq", value: "0", combinator: "OR" },
          ],
        })}
      />,
    );
    // Three filter rows should render with their respective labels
    expect(screen.getByText("Speed (knots)")).toBeInTheDocument();
    expect(screen.getByText("Ship Name")).toBeInTheDocument();
    expect(screen.getByText("Heading")).toBeInTheDocument();
    // Combinators for filters 2 and 3
    expect(screen.getByText("AND")).toBeInTheDocument();
    expect(screen.getByText("OR")).toBeInTheDocument();
  });

  it("renders all filter field options when Select is opened", async () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    await userEvent.click(screen.getByText("Speed (knots)"));
    // Verify a sample of field options
    expect(screen.getByText("Vessel ID")).toBeInTheDocument();
    expect(screen.getByText("MMSI")).toBeInTheDocument();
    expect(screen.getByText("Course Over Ground")).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByText("Callsign")).toBeInTheDocument();
  });

  it("renders all operator options when Select is opened", async () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // Click the operator Select (the ">" text inside the Select display)
    const operatorDisplays = screen.getAllByText(">");
    // The first ">" is the operator Select display value
    await userEvent.click(operatorDisplays[0]);
    // Verify all operator options
    expect(screen.getByRole("option", { name: "=" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "!=" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: ">" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: ">=" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "<" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "<=" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "LIKE" })).toBeInTheDocument();
  });

  // ── Filter lock during playback tests ──

  it("shows lock notice when isPlaying is true and filters exist", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          isPlaying: true,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    expect(
      screen.getByText(/Filters are locked during playback/i),
    ).toBeInTheDocument();
  });

  it("does not show lock notice when isPlaying is true but no filters", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          isPlaying: true,
          filters: [],
        })}
      />,
    );
    expect(
      screen.queryByText(/Filters are locked during playback/i),
    ).not.toBeInTheDocument();
  });

  it("disables 'Add filter' button when isPlaying is true", () => {
    render(<PlaybackDialog {...defaultProps({ isPlaying: true })} />);
    expect(screen.getByText("Add filter")).toBeDisabled();
  });

  it("disables filter field Select when isPlaying is true", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          isPlaying: true,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // The field Select displays "Speed (knots)" — find the Select root and check disabled
    const fieldDisplay = screen.getByText("Speed (knots)");
    const selectRoot = fieldDisplay.closest(".MuiSelect-select");
    expect(selectRoot).toHaveAttribute("aria-disabled", "true");
  });

  it("disables filter value TextField when isPlaying is true", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          isPlaying: true,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    expect(screen.getByDisplayValue("10")).toBeDisabled();
  });

  it("disables delete IconButton when isPlaying is true", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          isPlaying: true,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    // The delete button contains a DeleteOutline svg — find it via the svg's data-testid
    const deleteIcon = document.querySelector('[data-testid="DeleteOutlineIcon"]');
    const deleteButton = deleteIcon?.closest("button");
    expect(deleteButton).toBeDisabled();
  });

  it("does not call onFiltersChange when 'Add filter' is clicked during playback", () => {
    const onFiltersChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({ onFiltersChange, isPlaying: true })}
      />,
    );
    // Button is disabled — click events are blocked by the browser
    const addBtn = screen.getByText("Add filter").closest("button")!;
    expect(addBtn).toBeDisabled();
    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it("does not call onFiltersChange when value is changed during playback", () => {
    const onFiltersChange = vi.fn();
    render(
      <PlaybackDialog
        {...defaultProps({
          onFiltersChange,
          isPlaying: true,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
          ],
        })}
      />,
    );
    const valueInput = screen.getByDisplayValue("10");
    expect(valueInput).toBeDisabled();
    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it("renders existing filters as read-only during playback", () => {
    render(
      <PlaybackDialog
        {...defaultProps({
          isPlaying: true,
          filters: [
            { field: "speed", operator: "gt", value: "10" },
            { field: "shipName", operator: "like", value: "%CARGO%", combinator: "AND" },
          ],
        })}
      />,
    );
    // Filters are still visible but locked
    expect(screen.getByText("Speed (knots)")).toBeInTheDocument();
    expect(screen.getByText("Ship Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeDisabled();
    expect(screen.getByDisplayValue("%CARGO%")).toBeDisabled();
  });
});
