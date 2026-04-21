"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Bot, Box, CheckCircle2, ShoppingBag, Truck, Route, Users, TrendingUp, MapPin, Package, FileText, Warehouse, CreditCard, Receipt } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useAuth, UserRole } from "@/lib/auth-context";

export default function LandingPage() {
  const { login } = useAuth();

  const handleLogin = (role: UserRole) => {
    login(role);
  };

  const features = [
    {
      title: "Professional Billing & Invoicing",
      description:
        "Generate GST-ready invoices with payment modes, credit sales, PDF export, CSV export, and WhatsApp share/reminders.",
      status: "Live",
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
      title: "Multi-Godown Inventory Management",
      description:
        "Track stock across godowns, transfer inventory between locations, and monitor low-stock thresholds with restock actions.",
      status: "Live",
      icon: <Warehouse className="h-6 w-6 text-primary" />,
    },
    {
      title: "Payment Tracking & Collections",
      description:
        "Track outstanding balances, record collections, and send manual WhatsApp reminders with downloadable invoice PDFs.",
      status: "Live",
      icon: <CreditCard className="h-6 w-6 text-primary" />,
    },
    {
      title: "Stock Reports & Analytics",
      description:
        "Stock reports are available for summary, godown-wise, category-wise, and low-stock views. Advanced turnover/aging insights are being expanded.",
      status: "Growing",
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
    },
    {
      title: "Route Optimization & Delivery",
      description:
        "Trip planning and stop sequencing are available with nearest-stop routing; advanced optimization and fuel analytics are in progress.",
      status: "Growing",
      icon: <Route className="h-6 w-6 text-primary" />,
    },
    {
      title: "Customer Management",
      description:
        "Manage customers, locations, balances, visit planning, reminders, and downloadable customer statements (CSV/PDF).",
      status: "Live",
      icon: <Users className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span>SmartVyapar</span>
          </div>
          <nav className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground mr-2">Login as:</div>
            <Button variant="outline" size="sm" onClick={() => handleLogin("ADMIN")}>Admin</Button>
            <Button variant="outline" size="sm" onClick={() => handleLogin("EMPLOYEE")}>Employee</Button>
            <Button variant="outline" size="sm" onClick={() => handleLogin("FIELD_WORKER")}>Field Worker</Button>
            <Button variant="outline" size="sm" onClick={() => handleLogin("DRIVER")}>Driver</Button>
            <Button variant="outline" size="sm" onClick={() => handleLogin("AUDITOR")}>Auditor</Button>
            <Button variant="outline" size="sm" onClick={() => handleLogin("CA")}>CA</Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 md:pt-24 lg:pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mx-auto max-w-3xl space-y-6"
            >
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl text-gradient">
                Distribution Management Reimagined
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Power your distribution business with intelligent route planning, real-time tracking, and AI-driven insights. Streamline logistics, optimize deliveries, and grow your network.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" className="gap-2">
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline">
                  Watch Demo
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Background Gradient */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[500px] w-[500px] bg-primary/20 blur-[100px] rounded-full" />
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Complete Billing & Inventory Solution</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Core operations are production-ready today, with advanced analytics modules rolling out in phases.
              </p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                >
                  <Card variant="premium" className="h-full">
                    <CardHeader>
                      <div className="mb-4 h-12 w-12 rounded-lg gradient-primary/10 flex items-center justify-center border border-primary/20">
                        {feature.icon}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-xl">{feature.title}</CardTitle>
                        <Badge variant={feature.status === "Live" ? "default" : "secondary"}>{feature.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-6 text-center">
              Live = implemented and available now. Growing = available with ongoing upgrades.
            </p>
            <div className="mt-4 text-center">
              <Link href="/feature-audit" className="text-sm text-primary hover:underline">
                View detailed feature audit and roadmap
              </Link>
            </div>
          </div>
        </section>

        {/* Distribution Workflow Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Streamlined Billing & Inventory Workflow</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                From invoice generation to stock management across godowns, manage your entire billing and inventory process seamlessly.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "01", title: "Create Invoice", desc: "Generate professional invoices with GST compliance" },
                { step: "02", title: "Track Stock", desc: "Monitor inventory across multiple godowns in real-time" },
                { step: "03", title: "Manage Payments", desc: "Track outstanding, send reminders, and collect payments" },
                { step: "04", title: "Analytics & Reports", desc: "Get insights with comprehensive stock and sales reports" },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card variant="premium" className="text-center">
                    <CardHeader>
                      <div className="text-4xl font-bold text-gradient mb-2">{item.step}</div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Why Choose SmartVyapar?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Built specifically for distribution businesses to streamline operations and drive growth.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: <TrendingUp className="h-8 w-8" />,
                  title: "Increase Efficiency",
                  description: "Reduce delivery times and operational costs with optimized routing and real-time tracking."
                },
                {
                  icon: <MapPin className="h-8 w-8" />,
                  title: "Better Visibility",
                  description: "Track your entire distribution network with location-based insights and analytics."
                },
                {
                  icon: <BarChart3 className="h-8 w-8" />,
                  title: "Data-Driven Decisions",
                  description: "Make informed decisions with comprehensive analytics and AI-powered insights."
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card variant="premium" className="text-center h-full">
                    <CardHeader>
                      <div className="mx-auto mb-4 h-16 w-16 rounded-full gradient-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                        {item.icon}
                      </div>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span>SmartVyapar</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 SmartVyapar Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
