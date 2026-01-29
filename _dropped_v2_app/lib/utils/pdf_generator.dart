import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';

class PdfGenerator {
  static Future<Uint8List> generateInvoice({
    required String invoiceNo,
    required String customerName,
    required List<Map<String, dynamic>> items,
    required double total,
    PdfPageFormat format = PdfPageFormat.a4,
  }) async {
    final doc = pw.Document();
    final font = await PdfGoogleFonts.interRegular();
    final boldFont = await PdfGoogleFonts.interBold();

    doc.addPage(
      pw.Page(
        pageFormat: format,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('SMART VYAPAR', style: pw.TextStyle(font: boldFont, fontSize: 24)),
                  pw.Text('INVOICE', style: pw.TextStyle(font: boldFont, fontSize: 20)),
                ],
              ),
              pw.SizedBox(height: 20),
              
              // Info
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Bill To: $customerName', style: pw.TextStyle(font: font)),
                      pw.Text('Date: ${DateFormat('yyyy-MM-dd').format(DateTime.now())}', style: pw.TextStyle(font: font)),
                    ],
                  ),
                  pw.Text('No: $invoiceNo', style: pw.TextStyle(font: font)),
                ],
              ),
              pw.SizedBox(height: 30),

              // Table
              pw.TableHelper.fromTextArray(
                context: context,
                border: pw.TableBorder.all(color: PdfColors.grey300),
                headerStyle: pw.TextStyle(font: boldFont, fontWeight: pw.FontWeight.bold),
                cellStyle: pw.TextStyle(font: font),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.grey100),
                data: <List<String>>[
                  <String>['Item', 'Qty', 'Price', 'Total'],
                  ...items.map((item) => [
                    item['name'].toString(),
                    item['qty'].toString(),
                    item['price'].toString(),
                    (item['qty'] * item['price']).toString()
                  ]),
                ],
              ),
              pw.SizedBox(height: 20),
              
              // Total
              pw.Container(
                alignment: pw.Alignment.centerRight,
                child: pw.Text(
                  'Total: ₹$total',
                  style: pw.TextStyle(font: boldFont, fontSize: 18),
                ),
              ),
              
              pw.Spacer(),
              pw.Divider(),
              pw.Center(child: pw.Text('Thank you for your business!', style: pw.TextStyle(font: font, fontSize: 10))),
            ],
          );
        },
      ),
    );

    return doc.save();
  }

  static Future<void> printInvoice(Uint8List pdfData) async {
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfData,
    );
  }
}
