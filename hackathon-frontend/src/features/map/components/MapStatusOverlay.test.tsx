import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MapStatusOverlay from "./MapStatusOverlay";

describe("MapStatusOverlay", () => {
  it("muestra el estado de carga mientras el mapa no está listo", () => {
    render(<MapStatusOverlay ready={false} error={null} />);
    expect(screen.getByText(/cargando mapa/i)).toBeInTheDocument();
  });

  it("da prioridad al error sobre la carga", () => {
    render(<MapStatusOverlay ready={false} error="sin WebGL" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/no se pudo cargar el mapa/i);
    expect(screen.queryByText(/cargando mapa/i)).not.toBeInTheDocument();
  });

  it("no muestra nada cuando el mapa está listo", () => {
    const { container } = render(<MapStatusOverlay ready error={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
