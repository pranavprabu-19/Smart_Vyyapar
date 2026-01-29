import 'package:url_launcher/url_launcher.dart';

class WhatsAppHelper {
  static Future<void> sendInvoice(String phone, String invoiceUrl) async {
    // Basic implementation: Opens WhatsApp with a message containing the link
    // For automatic file sending, you need the Cloud API on the backend.
    
    final message = "Hello, here is your invoice: $invoiceUrl";
    final url = "https://wa.me/$phone?text=${Uri.encodeComponent(message)}";
    
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } else {
      throw 'Could not launch WhatsApp';
    }
  }
}
