import { CashShiftService } from './cashShiftService';

export class CashRegisterService {
  // Register management (delegate to CashShiftService)
  static createRegister = CashShiftService.createRegister;
  static getRegisters = CashShiftService.getRegisters;

  // Shift management (delegate to CashShiftService)
  static openShift = CashShiftService.openShift;
  static closeShift = CashShiftService.closeShift;
  static getCurrentShift = CashShiftService.getCurrentShift;
  static getShiftHistory = CashShiftService.getShiftHistory;
  static calculateShiftSummary = CashShiftService.calculateShiftSummary;
  static getShiftReport = CashShiftService.getShiftReport;
  static reconcileShift = CashShiftService.reconcileShift;
  static forceCloseShift = CashShiftService.forceCloseShift;
  static transferShift = CashShiftService.transferShift;
}