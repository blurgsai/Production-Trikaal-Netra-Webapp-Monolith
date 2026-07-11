import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import AnimationControls from "../AnimationControls";

describe("AnimationControls (integration: component → user interaction)", () => {
  const defaultProps = (overrides?: Partial<AnimationControlsProps>) => ({
    visible: true,
    isPlaying: false,
    currentTime: 30,
    duration: 600,
    playbackSpeed: 1,
    startTime: "2024-12-04T16:00:00Z",
    onPlayPause: vi.fn(),
    onSeek: vi.fn(),
    onSpeedChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  });

  type AnimationControlsProps = {
    visible: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    playbackSpeed: number;
    startTime: string;
    onPlayPause: () => void;
    onSeek: (time: number) => void;
    onSpeedChange: (speed: number) => void;
    onClose: () => void;
  };

  it("renders nothing when visible is false", () => {
    render(<AnimationControls {...defaultProps({ visible: false })} />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("renders play button when not playing", () => {
    render(<AnimationControls {...defaultProps({ isPlaying: false })} />);
    expect(screen.getByTestId("PlayArrowIcon")).toBeInTheDocument();
  });

  it("renders pause button when playing", () => {
    render(<AnimationControls {...defaultProps({ isPlaying: true })} />);
    expect(screen.getByTestId("PauseIcon")).toBeInTheDocument();
  });

  it("calls onPlayPause when play/pause button clicked", async () => {
    const onPlayPause = vi.fn();
    const { container } = render(
      <AnimationControls {...defaultProps({ onPlayPause })} />,
    );
    const buttons = container.querySelectorAll("button");
    const playButton = buttons[0];
    fireEvent.click(playButton);
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <AnimationControls {...defaultProps({ onClose })} />,
    );
    const buttons = container.querySelectorAll("button");
    const closeButton = buttons[buttons.length - 1];
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays current speed with x suffix", () => {
    render(<AnimationControls {...defaultProps({ playbackSpeed: 2 })} />);
    expect(screen.getByText("2x")).toBeInTheDocument();
  });

  it("slider has correct min and max", () => {
    render(<AnimationControls {...defaultProps({ duration: 600 })} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "600");
  });

  it("slider value matches currentTime", () => {
    render(<AnimationControls {...defaultProps({ currentTime: 120 })} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "120");
  });
});
