"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { REAL_PRODUCTS } from "./real-data";

export interface Product {
    sku: string;
    name: string;
    price: number;
    costPrice?: number; // Buying Price
    stock: number;
    category?: string;
    image?: string;
}

interface ProductContextType {
    products: Product[];
    addProduct: (product: Product) => void;
    updateStock: (sku: string, delta: number) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        // Initialize with Real Data
        const mapped = REAL_PRODUCTS.map(p => ({
            ...p,
            costPrice: p.price * 0.7, // Simulated Cost Price
            category: p.name.includes("Water") ? "Water" : "Beverage",
            image: p.name.includes("Jar") ? "🪣" : (p.name.includes("Bottle") ? "💧" : "🥤")
        }));
        setProducts(mapped);
    }, []);

    const addProduct = (product: Product) => {
        setProducts(prev => {
            const existingIndex = prev.findIndex(p => p.sku === product.sku);
            if (existingIndex >= 0) {
                // Update existing product
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], ...product };
                return updated;
            }
            return [product, ...prev];
        });
    };

    const updateStock = (sku: string, delta: number) => {
        setProducts(prev => prev.map(p =>
            p.sku === sku ? { ...p, stock: Math.max(0, p.stock + delta) } : p
        ));
    };

    return (
        <ProductContext.Provider value={{ products, addProduct, updateStock }}>
            {children}
        </ProductContext.Provider>
    );
}

export function useProducts() {
    const context = useContext(ProductContext);
    if (context === undefined) {
        throw new Error("useProducts must be used within a ProductProvider");
    }
    return context;
}
