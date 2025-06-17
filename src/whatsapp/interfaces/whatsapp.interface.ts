export interface WhatsappBaseMessage {
  from: string;
  to: string;
  type: 'text' | 'image' | 'document';
  timestamp: string;
}

export interface WhatsappTextMessage extends WhatsappBaseMessage {
  type: 'text';
  body: string;
}

export interface WhatsappImageMessage extends WhatsappBaseMessage {
  type: 'image';
  body: string;
  imageUrl: string;
  caption?: string;
}

export interface WhatsappDocumentMessage extends WhatsappBaseMessage {
  type: 'document';
  body: string;
  documentUrl: string;
  filename: string;
  mimeType: string;
}

export type WhatsappMessage =
  | WhatsappTextMessage
  | WhatsappImageMessage
  | WhatsappDocumentMessage;

export interface WhatsappWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages: WhatsappMessage[];
      };
      field: string;
    }>;
  }>;
}
