"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockAdjusterProps {
  currentStock: number;
  onUpdate: (quantity: number, type: "ADD" | "DEDUCT") => Promise<void>;
  isLowStock?: boolean;
  compact?: boolean;
}

export function StockAdjuster({
  currentStock,
  onUpdate,
  isLowStock = false,
  compact = false,
}: StockAdjusterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentStock.toString());
  const [adjustQty, setAdjustQty] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(currentStock.toString());
  }, [currentStock]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleIncrement = async (qty: number = adjustQty) => {
    setIsLoading(true);
    try {
      await onUpdate(qty, "ADD");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrement = async (qty: number = adjustQty) => {
    if (currentStock < qty) return;
    setIsLoading(true);
    try {
      await onUpdate(qty, "DEDUCT");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectInput = async () => {
    const newValue = parseInt(inputValue) || 0;
    if (newValue === currentStock) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      if (newValue > currentStock) {
        await onUpdate(newValue - currentStock, "ADD");
      } else {
        await onUpdate(currentStock - newValue, "DEDUCT");
      }
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleDirectInput();
    } else if (e.key === "Escape") {
      setInputValue(currentStock.toString());
      setIsEditing(false);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setInputValue((prev) => (parseInt(prev) + 1).toString());
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newVal = parseInt(inputValue) - 1;
      if (newVal >= 0) setInputValue(newVal.toString());
    }
  };

  if (compact) {
    // Compact mode for table rows - still improved
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-8 w-8 text-base font-bold transition-all",
            "hover:bg-red-50 hover:border-red-300 hover:text-red-600",
            "active:scale-95"
          )}
          onClick={() => handleDecrement(1)}
          disabled={isLoading || currentStock < 1}
        >
          <Minus className="h-4 w-4" />
        </Button>

        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                setInputValue(currentStock.toString());
                setIsEditing(false);
              }}
              className="w-16 h-8 text-center text-sm font-bold"
              min={0}
            />
            <Button
              size="icon"
              className="h-6 w-6"
              onClick={handleDirectInput}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={cn(
              "min-w-[3.5rem] h-8 px-2 text-center font-bold text-sm rounded-md",
              "border border-input bg-background hover:bg-muted/50 transition-colors",
              "cursor-text",
              isLowStock ? "text-red-600 border-red-200" : ""
            )}
          >
            {currentStock}
          </button>
        )}

        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-8 w-8 text-base font-bold transition-all",
            "hover:bg-green-50 hover:border-green-300 hover:text-green-600",
            "active:scale-95"
          )}
          onClick={() => handleIncrement(1)}
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Full mode with all features
  return (
    <div className="space-y-3">
      {/* Main adjustment controls */}
      <div className="flex items-center gap-2">
        {/* Decrement button - Large */}
        <Button
          variant="outline"
          size="lg"
          className={cn(
            "h-12 w-12 text-xl font-bold transition-all",
            "hover:bg-red-50 hover:border-red-300 hover:text-red-600",
            "active:scale-95"
          )}
          onClick={() => handleDecrement()}
          disabled={isLoading || currentStock < adjustQty}
        >
          <Minus className="h-5 w-5" />
        </Button>

        {/* Current stock / Input */}
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-24 h-12 text-center text-lg font-bold"
              min={0}
            />
            <Button
              size="icon"
              className="h-10 w-10 bg-green-600 hover:bg-green-700"
              onClick={handleDirectInput}
              disabled={isLoading}
            >
              <Check className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10"
              onClick={() => {
                setInputValue(currentStock.toString());
                setIsEditing(false);
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className={cn(
              "w-24 h-12 text-center text-xl font-bold rounded-lg",
              "border-2 border-input bg-background hover:bg-muted/50 transition-all",
              "cursor-text hover:border-primary/50",
              isLowStock ? "text-red-600 border-red-300" : ""
            )}
            title="Click to edit directly"
          >
            {currentStock}
          </button>
        )}

        {/* Increment button - Large */}
        <Button
          variant="outline"
          size="lg"
          className={cn(
            "h-12 w-12 text-xl font-bold transition-all",
            "hover:bg-green-50 hover:border-green-300 hover:text-green-600",
            "active:scale-95"
          )}
          onClick={() => handleIncrement()}
          disabled={isLoading}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Quick adjustment quantity selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Adjust by:</span>
        <div className="flex gap-1">
          {[1, 5, 10, 25, 50, 100].map((qty) => (
            <Button
              key={qty}
              variant={adjustQty === qty ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setAdjustQty(qty)}
            >
              {qty}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick add/remove buttons */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => handleDecrement(10)}
            disabled={isLoading || currentStock < 10}
          >
            -10
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
            onClick={() => handleDecrement(50)}
            disabled={isLoading || currentStock < 50}
          >
            -50
          </Button>
        </div>
        <div className="flex-1" />
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-green-600 hover:bg-green-50 hover:border-green-300"
            onClick={() => handleIncrement(10)}
            disabled={isLoading}
          >
            +10
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-green-600 hover:bg-green-50 hover:border-green-300"
            onClick={() => handleIncrement(50)}
            disabled={isLoading}
          >
            +50
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs text-green-600 hover:bg-green-50 hover:border-green-300"
            onClick={() => handleIncrement(100)}
            disabled={isLoading}
          >
            +100
          </Button>
        </div>
      </div>
    </div>
  );
}
