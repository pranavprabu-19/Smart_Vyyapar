import 'package:flutter/material.dart';
// import 'package:google_maps_flutter/google_maps_flutter.dart';
// import 'package:location/location.dart';

class TrackingScreen extends StatefulWidget {
  const TrackingScreen({super.key});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  // GoogleMapController? _controller;
  // LocationData? _currentLocation;

  @override
  void initState() {
    super.initState();
    // _getCurrentLocation();
  }

  /*
  Future<void> _getCurrentLocation() async {
    final location = Location();
    final loc = await location.getLocation();
    setState(() {
      _currentLocation = loc;
    });
  }
  */

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Live Tracking')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.map, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text(
              'Google Maps Integration',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                'To enable Maps:\n1. Add google_maps_flutter to pubspec.yaml\n2. Get an API Key from Google Cloud Console\n3. Uncomment the code in this file',
                textAlign: TextAlign.center,
              ),
            ),
            ElevatedButton(
              onPressed: () {
                // _controller?.animateCamera(...)
              },
              child: const Text('Locate Me'),
            ),
          ],
        ),
      ),
    );
  }
}
