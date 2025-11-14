import "reflect-metadata";
import { MealVoucherFactory } from "../MealVoucherFactory";
import { SwileProvider } from "../providers/SwileProvider";
import { EdenredProvider } from "../providers/EdenredProvider";
import { SodexoProvider } from "../providers/SodexoProvider";
import { ApetizProvider } from "../providers/ApetizProvider";
import { UpDejeunerProvider } from "../providers/UpDejeunerProvider";

jest.mock("../providers/SwileProvider");
jest.mock("../providers/EdenredProvider");
jest.mock("../providers/SodexoProvider");
jest.mock("../providers/ApetizProvider");
jest.mock("../providers/UpDejeunerProvider");

describe("MealVoucherFactory Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MealVoucherFactory.clearCache();
  });

  describe("getProvider", () => {
    it("should create Swile provider", () => {
      const provider = MealVoucherFactory.getProvider("swile");
      expect(provider).toBeInstanceOf(SwileProvider);
    });

    it("should create Edenred provider", () => {
      const provider = MealVoucherFactory.getProvider("edenred");
      expect(provider).toBeInstanceOf(EdenredProvider);
    });

    it("should create Sodexo provider", () => {
      const provider = MealVoucherFactory.getProvider("sodexo");
      expect(provider).toBeInstanceOf(SodexoProvider);
    });

    it("should create Apetiz provider", () => {
      const provider = MealVoucherFactory.getProvider("apetiz");
      expect(provider).toBeInstanceOf(ApetizProvider);
    });

    it("should create Up Déjeuner provider", () => {
      const provider = MealVoucherFactory.getProvider("up_dejeuner");
      expect(provider).toBeInstanceOf(UpDejeunerProvider);
    });

    it("should cache provider instances", () => {
      const provider1 = MealVoucherFactory.getProvider("swile");
      const provider2 = MealVoucherFactory.getProvider("swile");

      expect(provider1).toBe(provider2);
      expect(SwileProvider).toHaveBeenCalledTimes(1);
    });

    it("should throw error for unknown provider", () => {
      expect(() => {
        MealVoucherFactory.getProvider("unknown" as any);
      }).toThrow("Unknown meal voucher provider: unknown");
    });
  });

  describe("isProviderConfigured", () => {
    it("should check if provider is configured", () => {
      const mockIsConfigured = jest.fn().mockReturnValue(true);
      (SwileProvider as jest.Mock).mockImplementation(() => ({
        isConfigured: mockIsConfigured,
      }));

      const result = MealVoucherFactory.isProviderConfigured("swile");

      expect(result).toBe(true);
      expect(mockIsConfigured).toHaveBeenCalled();
    });

    it("should return false when provider is not configured", () => {
      const mockIsConfigured = jest.fn().mockReturnValue(false);
      (EdenredProvider as jest.Mock).mockImplementation(() => ({
        isConfigured: mockIsConfigured,
      }));

      const result = MealVoucherFactory.isProviderConfigured("edenred");

      expect(result).toBe(false);
    });
  });

  describe("clearCache", () => {
    it("should clear the provider cache", () => {
      MealVoucherFactory.getProvider("swile");
      expect(SwileProvider).toHaveBeenCalledTimes(1);

      MealVoucherFactory.clearCache();
      MealVoucherFactory.getProvider("swile");

      expect(SwileProvider).toHaveBeenCalledTimes(2);
    });
  });
});
