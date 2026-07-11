import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PlaybackDialog from "../PlaybackDialog";

import type { PlaybackRange, TimeGranularity } from "../../model/types";

describe("PlaybackDialog (integration: component → user interaction)", () => {
  const defaultProps = (overrides?: Partial<PlaybackDialogProps>) => ({
    open: true,
    onClose: vi.fn(),
    playbackRange: { start: "2024-12-04T21:30", end: "2024-12-04T21:40" } as PlaybackRange,
    setPlaybackRange: vi.fn(),
    granularity: "minute" as TimeGranularity,
    onGranularityChange: vi.fn(),
    onApply: vi.fn(),
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
});
