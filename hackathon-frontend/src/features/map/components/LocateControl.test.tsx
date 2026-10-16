import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import LocateControl from "./LocateControl";

describe("LocateControl", () => {
  it("pide la ubicación al pulsar el botón", async () => {
    const onLocate = vi.fn();
    render(<LocateControl status="idle" onLocate={onLocate} />);

    await userEvent.click(
      screen.getByRole("button", { name: /mi ubicación/i }),
    );

    expect(onLocate).toHaveBeenCalledTimes(1);
  });

  it("muestra el mensaje de permiso denegado", () => {
    render(<LocateControl status="denied" onLocate={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/permiso/i);
  });

  it("indica el estado en curso y deshabilita el botón", () => {
    render(<LocateControl status="locating" onLocate={vi.fn()} />);
    const button = screen.getByRole("button", { name: /mi ubicación/i });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("no muestra mensaje de error cuando hay ubicación", () => {
    render(<LocateControl status="available" onLocate={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
