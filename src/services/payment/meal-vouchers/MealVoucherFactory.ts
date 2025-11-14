import { IMealVoucherProvider } from "./interfaces/IMealVoucherProvider";
import { SwileProvider } from "./providers/SwileProvider";
import { EdenredProvider } from "./providers/EdenredProvider";
import { SodexoProvider } from "./providers/SodexoProvider";
import { ApetizProvider } from "./providers/ApetizProvider";
import { UpDejeunerProvider } from "./providers/UpDejeunerProvider";

export type MealVoucherProviderType = "swile" | "edenred" | "sodexo" | "apetiz" | "up_dejeuner";

export class MealVoucherFactory {
  private static providers: Map<MealVoucherProviderType, IMealVoucherProvider> = new Map();

  static getProvider(type: MealVoucherProviderType): IMealVoucherProvider {
    // Return cached provider if it exists
    if (this.providers.has(type)) {
      return this.providers.get(type)!;
    }

    // Create new provider instance
    let provider: IMealVoucherProvider;

    switch (type) {
      case "swile":
        provider = new SwileProvider();
        break;
      case "edenred":
        provider = new EdenredProvider();
        break;
      case "sodexo":
        provider = new SodexoProvider();
        break;
      case "apetiz":
        provider = new ApetizProvider();
        break;
      case "up_dejeuner":
        provider = new UpDejeunerProvider();
        break;
      default:
        throw new Error(`Unknown meal voucher provider: ${type}`);
    }

    // Cache the provider
    this.providers.set(type, provider);

    return provider;
  }

  static isProviderConfigured(type: MealVoucherProviderType): boolean {
    const provider = this.getProvider(type);
    return provider.isConfigured();
  }

  static clearCache(): void {
    this.providers.clear();
  }
}
