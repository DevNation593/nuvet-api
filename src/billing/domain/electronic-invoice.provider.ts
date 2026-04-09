export interface InvoiceParty {
    idType: '04' | '05' | '06' | '07' | '08';
    id: string;
    name: string;
    address?: string;
    email?: string;
}

export interface ElectronicInvoiceItem {
    mainCode?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxes: Array<{
        taxCode: string;
        rateCode: string;
        rate?: number;
        taxableBase?: number;
    }>;
}

export interface ElectronicInvoicePayment {
    method: string;
    amount: number;
    reference?: string;
}

export interface ElectronicInvoicePayload {
    internalReference: string;
    issueDate: string;
    establishmentCode?: string;
    emissionPointCode?: string;
    asyncEmission?: boolean;
    buyer: InvoiceParty;
    items: ElectronicInvoiceItem[];
    payments?: ElectronicInvoicePayment[];
}

export interface IssueElectronicInvoiceResult {
    providerInvoiceId: string;
    providerStatus: string;
    documentNumber?: string;
    accessKey?: string;
    authorizationCode?: string;
    authorizedAt?: string;
    raw?: unknown;
}

export interface ElectronicInvoiceStatusResult {
    providerInvoiceId: string;
    providerStatus: string;
    documentNumber?: string;
    accessKey?: string;
    authorizedAt?: string;
    rejectedReason?: string;
    raw?: unknown;
}

export interface IElectronicInvoiceProvider {
    issueInvoice(payload: ElectronicInvoicePayload): Promise<IssueElectronicInvoiceResult>;
    getInvoiceStatus(providerInvoiceId: string): Promise<ElectronicInvoiceStatusResult>;
}

export const ELECTRONIC_INVOICE_PROVIDER = Symbol('IElectronicInvoiceProvider');
