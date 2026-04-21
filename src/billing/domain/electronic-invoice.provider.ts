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
    /** SRI payment method code (01=cash, 19=card, 20=other). When set, a single payment is generated for the full total. */
    paymentMethodCode?: string;
}

export interface IssueElectronicInvoiceResult {
    providerInvoiceId: string;
    providerStatus: string;
    documentNumber?: string;
    accessKey?: string;
    authorizationCode?: string;
    authorizedAt?: string;
    pdfUrl?: string;
    xmlUrl?: string;
    raw?: unknown;
}

export interface ElectronicInvoiceStatusResult {
    providerInvoiceId: string;
    providerStatus: string;
    documentNumber?: string;
    accessKey?: string;
    authorizedAt?: string;
    rejectedReason?: string;
    pdfUrl?: string;
    xmlUrl?: string;
    raw?: unknown;
}

export interface DocumentUrlResult {
    url: string;
    filename?: string;
}

export interface TenantBillingCredentials {
    apiKey?: string;
    apiSecret?: string;
    establishmentCode?: string;
    emissionPointCode?: string;
}

export interface IElectronicInvoiceProvider {
    issueInvoice(payload: ElectronicInvoicePayload, credentials?: TenantBillingCredentials): Promise<IssueElectronicInvoiceResult>;
    getInvoiceStatus(providerInvoiceId: string, credentials?: TenantBillingCredentials): Promise<ElectronicInvoiceStatusResult>;
    getRideUrl(accessKey: string, credentials?: TenantBillingCredentials): Promise<DocumentUrlResult>;
    getXmlUrl(accessKey: string, type?: 'authorized' | 'signed' | 'unsigned', credentials?: TenantBillingCredentials): Promise<DocumentUrlResult>;
}

export const ELECTRONIC_INVOICE_PROVIDER = Symbol('IElectronicInvoiceProvider');
