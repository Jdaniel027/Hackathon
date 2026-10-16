import { describe, expect, it } from "vitest";
import { submitCitizenReport } from "./reportService";

describe("submitCitizenReport", () => {
  it("lanza un error si no se proporciona la ubicación", async () => {
    await expect(
      submitCitizenReport({
        location: null,
        photo: new File([""], "test.png", { type: "image/png" }),
      }),
    ).rejects.toThrow("La ubicación del incidente es obligatoria.");
  });

  it("lanza un error si no se proporciona la fotografía", async () => {
    await expect(
      submitCitizenReport({
        location: { latitude: 25.5744, longitude: -108.4633 },
        photo: null,
      }),
    ).rejects.toThrow("La fotografía es obligatoria.");
  });

  it("retorna acuse de recibo privado con estado 'pending' al enviar datos válidos", async () => {
    const file = new File(["fake-image-content"], "flood.jpg", {
      type: "image/jpeg",
    });

    const response = await submitCitizenReport({
      location: { latitude: 25.5744, longitude: -108.4633 },
      photo: file,
      description: "Agua cubriendo la banqueta",
    });

    expect(response.id).toBeDefined();
    expect(response.status).toBe("pending");
    expect(response.message).toContain("pendiente de verificación");
    expect(response.createdAt).toBeDefined();
  });
});
