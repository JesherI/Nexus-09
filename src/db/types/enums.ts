export type UserType = 'owner' | 'admin' | 'cashier';

export type ProductType = 'piece' | 'package';

export type MovementType = 'entrada' | 'salida' | 'ajuste' | 'merma' | 'devolucion';

export type TaxType = 'IVA' | 'EXENTO' | 'TASA_CERO' | 'IEPS' | 'ISR';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'credit';

export type PaymentStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';

export type FileType = 'image' | 'document' | 'other';

export type CustomerType = 'individual' | 'business';

export type ShiftStatus = 'open' | 'closed' | 'reconciled';

export type TokenType = 'access' | 'refresh';