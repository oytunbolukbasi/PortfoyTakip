import { priceMonitor } from "../server/services/price-monitor";
async function run() {
  await priceMonitor.updateStockPrices();
  process.exit(0);
}
run().catch(console.error);
