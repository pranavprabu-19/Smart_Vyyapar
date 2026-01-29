import 'package:flutter/material.dart';
import '../utils/pdf_generator.dart';
import 'package:pdf/pdf.dart';

class InvoiceScreen extends StatefulWidget {
  const InvoiceScreen({super.key});

  @override
  State<InvoiceScreen> createState() => _InvoiceScreenState();
}

class _InvoiceScreenState extends State<InvoiceScreen> {
  final List<Map<String, dynamic>> _items = [];
  final _productController = TextEditingController();
  final _qtyController = TextEditingController();
  final _priceController = TextEditingController();

  void _addItem() {
    if (_productController.text.isEmpty) return;
    setState(() {
      _items.add({
        'name': _productController.text,
        'qty': int.tryParse(_qtyController.text) ?? 1,
        'price': double.tryParse(_priceController.text) ?? 0.0,
      });
      _productController.clear();
      _qtyController.clear();
      _priceController.clear();
    });
  }

  double get _total => _items.fold(0, (sum, item) => sum + (item['qty'] * item['price']));

  Future<void> _generateAndPrint() async {
    final pdfData = await PdfGenerator.generateInvoice(
      invoiceNo: 'INV-${DateTime.now().millisecondsSinceEpoch}',
      customerName: 'Cash Customer', // Logic to select customer
      items: _items,
      total: _total,
      format: PdfPageFormat.a4, // Or PdfPageFormat.a5
    );
    await PdfGenerator.printInvoice(pdfData);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Invoice')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(flex: 3, child: TextField(controller: _productController, decoration: const InputDecoration(labelText: 'Product'))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: _qtyController, decoration: const InputDecoration(labelText: 'Qty'))),
                const SizedBox(width: 8),
                Expanded(child: TextField(controller: _priceController, decoration: const InputDecoration(labelText: 'Price'))),
                IconButton(onPressed: _addItem, icon: const Icon(Icons.add_circle)),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: _items.length,
              itemBuilder: (context, index) {
                final item = _items[index];
                return ListTile(
                  title: Text(item['name']),
                  subtitle: Text('${item['qty']} x ₹${item['price']}'),
                  trailing: Text('₹${item['qty'] * item['price']}'),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[100],
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Total: ₹$_total', style: Theme.of(context).textTheme.titleLarge),
                ElevatedButton.icon(
                  onPressed: _items.isEmpty ? null : _generateAndPrint,
                  icon: const Icon(Icons.print),
                  label: const Text('Print Invoice'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
