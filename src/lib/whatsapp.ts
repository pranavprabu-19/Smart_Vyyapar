
interface WhatsAppMessage {
    to: string;
    type: 'template';
    template: {
        name: string;
        language: { code: string };
        components: any[];
    };
}

// This would connect to Gupshup or WhatsApp Business API
// For now, it logs the API call which is "Real" in development context without paid credentials.
export async function sendWhatsAppInvoice(to: string, pdfUrl: string, filename: string, customerName: string) {
    console.log(`[WHATSAPP-API] Sending to ${to}...`);

    // Construct the payload as per standard WhatsApp Business API
    const payload: WhatsAppMessage = {
        to: to,
        type: "template",
        template: {
            name: "invoice_sent",
            language: { code: "en_US" },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "document",
                            document: {
                                link: pdfUrl,
                                filename: filename
                            }
                        }
                    ]
                },
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: customerName }
                    ]
                }
            ]
        }
    };

    // Simulate API Network Delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In production:
    // const res = await fetch('https://api.gupshup.io/wa/api/v1/template/msg', {
    //     method: 'POST',
    //     headers: { 'Authorization': `Bearer ${process.env.GUPSHUP_API_KEY}` },
    //     body: JSON.stringify(payload)
    // });

    // For now we assume success
    console.log(`[WHATSAPP-API] Success! Payload:`, JSON.stringify(payload, null, 2));
    return { success: true, messageId: "wa_test_" + Date.now() };
}
