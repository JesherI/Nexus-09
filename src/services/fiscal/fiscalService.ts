import { db } from '../database';

export interface FiscalConfig {
  series: string;
  currentFolio: number;
  businessId: string;
  updatedAt: Date;
}

export class FiscalService {
  private static readonly DEFAULT_SERIES = 'VENTA';

  // Get next folio for a series
  static async getNextFolio(businessId: string, series: string = this.DEFAULT_SERIES): Promise<string> {
    // For now, we'll generate sequential folios
    // In production, this should be stored in a separate table for concurrency safety

    const existingSales = await db.sales
      .where('[businessId+series]')
      .equals([businessId, series])
      .toArray();

    // Find the highest folio number
    let maxFolio = 0;
    for (const sale of existingSales) {
      const folioNum = parseInt(sale.folio, 10);
      if (!isNaN(folioNum) && folioNum > maxFolio) {
        maxFolio = folioNum;
      }
    }

    const nextFolio = (maxFolio + 1).toString().padStart(6, '0'); // 6-digit padding
    return nextFolio;
  }

  // Generate folio and series for a sale
  static async generateFiscalNumber(businessId: string, series?: string): Promise<{ folio: string; series: string }> {
    const actualSeries = series || this.DEFAULT_SERIES;
    const folio = await this.getNextFolio(businessId, actualSeries);

    return { folio, series: actualSeries };
  }

  // Validate fiscal number format
  static validateFiscalNumber(folio: string, series: string): boolean {
    // Basic validation - folio should be numeric, series should not be empty
    if (!folio || !series) return false;
    if (!/^\d+$/.test(folio)) return false; // Only digits
    if (folio.length < 1 || folio.length > 10) return false; // Reasonable length
    return true;
  }

  // Get sales by fiscal number
  static async getSaleByFiscalNumber(businessId: string, series: string, folio: string): Promise<any | null> {
    return await db.sales
      .where('[businessId+series+folio]')
      .equals([businessId, series, folio])
      .first();
  }

  // Get fiscal summary for business
  static async getFiscalSummary(businessId: string): Promise<{
    totalSales: number;
    seriesUsed: string[];
    lastFolioBySeries: Record<string, string>;
    dateRange: { from: Date; to: Date };
  }> {
    const sales = await db.sales
      .where('businessId')
      .equals(businessId)
      .toArray();

    const completedSales = sales.filter(s => s.paymentStatus === 'completed' && s.isActive);

    const seriesUsed = [...new Set(completedSales.map(s => s.series))];
    const lastFolioBySeries: Record<string, string> = {};

    for (const series of seriesUsed) {
      const seriesSales = completedSales
        .filter(s => s.series === series)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (seriesSales.length > 0) {
        lastFolioBySeries[series] = seriesSales[0].folio;
      }
    }

    const dates = completedSales.map(s => s.createdAt.getTime()).sort();
    const dateRange = {
      from: dates.length > 0 ? new Date(dates[0]) : new Date(),
      to: dates.length > 0 ? new Date(dates[dates.length - 1]) : new Date()
    };

    return {
      totalSales: completedSales.length,
      seriesUsed,
      lastFolioBySeries,
      dateRange
    };
  }

  // Check for duplicate fiscal numbers
  static async checkDuplicateFiscalNumber(businessId: string, series: string, folio: string, excludeSaleId?: string): Promise<boolean> {
    const existing = await this.getSaleByFiscalNumber(businessId, series, folio);
    if (!existing) return false;
    if (excludeSaleId && existing.id === excludeSaleId) return false;
    return true;
  }

  // Format fiscal number for display
  static formatFiscalNumber(series: string, folio: string): string {
    return `${series}-${folio}`;
  }

  // Parse fiscal number from display format
  static parseFiscalNumber(fiscalNumber: string): { series: string; folio: string } | null {
    const match = fiscalNumber.match(/^([A-Z]+)-(\d+)$/);
    if (!match) return null;

    return {
      series: match[1],
      folio: match[2]
    };
  }
}