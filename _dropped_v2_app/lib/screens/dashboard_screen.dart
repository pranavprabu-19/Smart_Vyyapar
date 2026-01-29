import 'package:flutter/material.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Determine layout based on screen width
    final isDesktop = MediaQuery.of(context).size.width > 600;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Navigator.pushReplacementNamed(context, '/login'),
          ),
        ],
      ),
      drawer: isDesktop ? null : const Drawer(child: NavigationMenu()),
      body: Row(
        children: [
          if (isDesktop)
            const SizedBox(
              width: 250,
              child: Drawer(child: NavigationMenu()),
            ),
          Expanded(
            child: GridView.count(
              padding: const EdgeInsets.all(16),
              crossAxisCount: isDesktop ? 4 : 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _DashboardCard(
                  title: 'Invoices',
                  icon: Icons.receipt_long,
                  color: Colors.blue,
                  onTap: () {},
                ),
                _DashboardCard(
                  title: 'Customers',
                  icon: Icons.people,
                  color: Colors.green,
                  onTap: () {},
                ),
                _DashboardCard(
                  title: 'Inventory',
                  icon: Icons.inventory,
                  color: Colors.orange,
                  onTap: () {},
                ),
                _DashboardCard(
                  title: 'Trip Sheets',
                  icon: Icons.map,
                  color: Colors.red,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class NavigationMenu extends StatelessWidget {
  const NavigationMenu({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        const DrawerHeader(
          decoration: BoxDecoration(color: Colors.blue),
          child: Text('SmartVyapar', style: TextStyle(color: Colors.white, fontSize: 24)),
        ),
        ListTile(leading: const Icon(Icons.dashboard), title: const Text('Overview'), onTap: () {}),
        ListTile(leading: const Icon(Icons.add_shopping_cart), title: const Text('New Sales'), onTap: () {}),
        ListTile(leading: const Icon(Icons.print), title: const Text('Print Reports'), onTap: () {}),
      ],
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _DashboardCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: color),
            const SizedBox(height: 16),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    );
  }
}
