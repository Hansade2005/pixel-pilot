"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, Monitor, Smartphone, Tablet } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type DevicePreset = {
  name: string;
  width: number;
  height: number;
  type: "mobile" | "tablet" | "desktop";
  icon: ReactNode;
};

export const DEVICE_PRESETS: DevicePreset[] = [
  // Mobile
  { name: "iPhone SE", width: 375, height: 667, type: "mobile", icon: <Smartphone className="h-4 w-4" /> },
  { name: "iPhone 12/13", width: 390, height: 844, type: "mobile", icon: <Smartphone className="h-4 w-4" /> },
  { name: "iPhone 12 Pro Max", width: 428, height: 926, type: "mobile", icon: <Smartphone className="h-4 w-4" /> },
  { name: "Samsung Galaxy S20", width: 360, height: 640, type: "mobile", icon: <Smartphone className="h-4 w-4" /> },
  { name: "Pixel 5", width: 393, height: 851, type: "mobile", icon: <Smartphone className="h-4 w-4" /> },

  // Tablet
  { name: "iPad", width: 768, height: 1024, type: "tablet", icon: <Tablet className="h-4 w-4" /> },
  { name: "iPad Pro", width: 1024, height: 1366, type: "tablet", icon: <Tablet className="h-4 w-4" /> },
  { name: "Surface Pro 7", width: 912, height: 1368, type: "tablet", icon: <Tablet className="h-4 w-4" /> },

  // Desktop
  { name: "Desktop", width: 1440, height: 900, type: "desktop", icon: <Monitor className="h-4 w-4" /> },
  { name: "Desktop HD", width: 1920, height: 1080, type: "desktop", icon: <Monitor className="h-4 w-4" /> },
  { name: "Full HD", width: 1920, height: 1080, type: "desktop", icon: <Monitor className="h-4 w-4" /> },
];

export type WebPreviewContextValue = {
  url: string;
  setUrl: (url: string) => void;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
  device: DevicePreset | null;
  setDevice: (device: DevicePreset | null) => void;
};

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null);

const useWebPreview = () => {
  const context = useContext(WebPreviewContext);
  if (!context) {
    throw new Error("WebPreview components must be used within a WebPreview");
  }
  return context;
};

export type WebPreviewProps = ComponentProps<"div"> & {
  defaultUrl?: string;
  onUrlChange?: (url: string) => void;
  defaultDevice?: DevicePreset | null;
  onDeviceChange?: (device: DevicePreset | null) => void;
};

export const WebPreview = ({
  className,
  children,
  defaultUrl = "",
  onUrlChange,
  defaultDevice = null,
  onDeviceChange,
  ...props
}: WebPreviewProps) => {
  const [url, setUrl] = useState(defaultUrl);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [device, setDevice] = useState<DevicePreset | null>(defaultDevice);

  // Sync URL state when defaultUrl changes
  useEffect(() => {
    setUrl(defaultUrl);
  }, [defaultUrl]);

  // Sync device state when defaultDevice changes
  useEffect(() => {
    setDevice(defaultDevice);
  }, [defaultDevice]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    onUrlChange?.(newUrl);
  };

  const handleDeviceChange = (newDevice: DevicePreset | null) => {
    setDevice(newDevice);
    onDeviceChange?.(newDevice);
  };

  const contextValue: WebPreviewContextValue = {
    url,
    setUrl: handleUrlChange,
    consoleOpen,
    setConsoleOpen,
    device,
    setDevice: handleDeviceChange,
  };

  return (
    <WebPreviewContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex size-full flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  );
};

export type WebPreviewNavigationProps = ComponentProps<"div">;

export const WebPreviewNavigation = ({
  className,
  children,
  ...props
}: WebPreviewNavigationProps) => (
  <div
    className={cn("flex items-center gap-1 border-b p-2", className)}
    {...props}
  >
    {children}
  </div>
);

export type WebPreviewNavigationButtonProps = ComponentProps<typeof Button> & {
  tooltip?: string;
};

export const WebPreviewNavigationButton = ({
  onClick,
  disabled,
  tooltip,
  children,
  ...props
}: WebPreviewNavigationButtonProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="h-8 w-8 p-0 hover:text-foreground"
          disabled={disabled}
          onClick={onClick}
          size="sm"
          variant="ghost"
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export type WebPreviewUrlProps = ComponentProps<typeof Input>;

export const WebPreviewUrl = ({
  value,
  onChange,
  onKeyDown,
  ...props
}: WebPreviewUrlProps) => {
  const { url, setUrl } = useWebPreview();
  const [inputValue, setInputValue] = useState(url);

  // Sync input value with context URL when it changes externally
  useEffect(() => {
    setInputValue(url);
  }, [url]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    onChange?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const target = event.target as HTMLInputElement;
      setUrl(target.value);
    }
    onKeyDown?.(event);
  };

  return (
    <Input
      className="h-8 flex-1 text-sm"
      onChange={onChange ?? handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Enter URL..."
      value={value ?? inputValue}
      {...props}
    />
  );
};

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type WebPreviewDeviceSelectorProps = ComponentProps<"div">;

export const WebPreviewDeviceSelector = ({
  className,
  ...props
}: WebPreviewDeviceSelectorProps) => {
  const { device, setDevice } = useWebPreview();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-2", className)}
        >
          {device ? (
            <>
              {device.icon}
              <span className="hidden sm:inline">{device.name}</span>
              <span className="text-xs text-muted-foreground">
          {device.width}×{device.height}
              </span>
            </>
          ) : (
            <>
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Responsive</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Device Presets</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setDevice(null)}
          className="flex items-center gap-2"
        >
          <Monitor className="h-4 w-4" />
          <span>Responsive (Auto)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Mobile</DropdownMenuLabel>
        {DEVICE_PRESETS.filter(d => d.type === "mobile").map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => setDevice(preset)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {preset.icon}
              <span>{preset.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {preset.width}×{preset.height}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tablet</DropdownMenuLabel>
        {DEVICE_PRESETS.filter(d => d.type === "tablet").map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => setDevice(preset)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {preset.icon}
              <span>{preset.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {preset.width}×{preset.height}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Desktop</DropdownMenuLabel>
        {DEVICE_PRESETS.filter(d => d.type === "desktop").map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => setDevice(preset)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {preset.icon}
              <span>{preset.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {preset.width}×{preset.height}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export type WebPreviewBodyProps = ComponentProps<"iframe"> & {
  loading?: ReactNode;
};

export const WebPreviewBody = ({
  className,
  loading,
  src,
  ...props
}: WebPreviewBodyProps) => {
  const { url, device } = useWebPreview();

  return (
    <div className="h-full">
      {device ? (
        <div className="h-full p-2">
          <div className="relative h-full flex flex-col">
            {/* Device frame - fills available space */}
            <div
              className={cn(
                "relative overflow-hidden shadow-2xl bg-black rounded-lg flex-1",
                device.type === "mobile" && "rounded-[2rem]",
                device.type === "tablet" && "rounded-xl",
                device.type === "desktop" && "rounded-lg"
              )}
              style={{
                paddingTop: device.type === "mobile" ? 20 : device.type === "tablet" ? 16 : 12,
                paddingBottom: device.type === "mobile" ? 20 : device.type === "tablet" ? 16 : 12,
                paddingLeft: device.type === "mobile" ? 10 : device.type === "tablet" ? 8 : 6,
                paddingRight: device.type === "mobile" ? 10 : device.type === "tablet" ? 8 : 6,
              }}
            >
              {/* Screen */}
              <div
                className="bg-white rounded-sm overflow-hidden w-full h-full"
              >
                <iframe
                  className={cn("w-full h-full border-0", className)}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                  src={(src ?? url) || undefined}
                  title="Preview"
                  {...props}
                />
              </div>

              {/* Home indicator for mobile */}
              {device.type === "mobile" && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-400 rounded-full opacity-50" />
              )}
            </div>

            {/* Device label - positioned to not take extra space */}
            <div className="text-center mt-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                {device.name} ({device.width}×{device.height})
              </span>
            </div>
          </div>
          {loading}
        </div>
      ) : (
        <iframe
          className={cn("w-full h-full border-0", className)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          src={(src ?? url) || undefined}
          title="Preview"
          {...props}
        />
      )}
      {!device && loading}
    </div>
  );
};

export type WebPreviewConsoleProps = ComponentProps<"div"> & {
  logs?: Array<{
    level: "log" | "warn" | "error";
    message: string;
    timestamp: Date;
  }>;
};

export const WebPreviewConsole = ({
  className,
  logs = [],
  children,
  ...props
}: WebPreviewConsoleProps) => {
  const { consoleOpen, setConsoleOpen } = useWebPreview();

  return (
    <Collapsible
      className={cn("border-t font-mono text-sm", className)}
      onOpenChange={setConsoleOpen}
      open={consoleOpen}
      {...props}
    >
      <CollapsibleTrigger asChild>
        <Button
          className="flex w-full items-center justify-between p-4 text-left font-medium"
          variant="ghost"
        >
          Console
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              consoleOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "px-4 pb-4",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in"
        )}
      >
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No console output</p>
          ) : (
            logs.map((log, index) => (
              <div
                className={cn(
                  "text-xs",
                  log.level === "error" && "text-destructive",
                  log.level === "warn" && "text-yellow-600",
                  log.level === "log" && "text-foreground"
                )}
                key={`${log.timestamp.getTime()}-${index}`}
              >
                <span className="text-muted-foreground">
                  {log.timestamp.toLocaleTimeString()}
                </span>{" "}
                {log.message}
              </div>
            ))
          )}
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
